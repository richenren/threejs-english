package com.example.kids.content;
import com.example.kids.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/api/v1")
public class ContentController {
 private final ContentRepository contents; private final PackageRepository packages; private final ObjectMapper mapper;
 public ContentController(ContentRepository c,PackageRepository p,ObjectMapper m){contents=c;packages=p;mapper=m;}
 public record ContentInput(@NotBlank String text,String meaningCn,String type,String assetKey){}
 @GetMapping("/parent/content") public ApiResponse<List<ContentEntity>> list(){return ApiResponse.ok(contents.findAll());}
 @PostMapping("/parent/content") @Transactional public ApiResponse<ContentEntity> create(@Valid @RequestBody ContentInput in){
  String word=in.text().trim(); if(contents.existsByTextIgnoreCase(word))throw new ResponseStatusException(HttpStatus.CONFLICT,"Duplicate content");
  return ApiResponse.ok(contents.save(new ContentEntity(UUID.randomUUID().toString(),word,in.meaningCn(),validType(in.type()),in.assetKey()==null?"":in.assetKey(),"DRAFT")));
 }
 @PutMapping("/parent/content/{id}") @Transactional public ApiResponse<ContentEntity> update(@PathVariable String id,@Valid @RequestBody ContentInput in){
  var item=mustGet(id); if("READY".equals(item.status))throw new ResponseStatusException(HttpStatus.CONFLICT,"Published-ready item must be duplicated before editing");
  item.text=in.text().trim();item.meaningCn=in.meaningCn();item.type=validType(in.type());item.assetKey=in.assetKey()==null?"":in.assetKey();item.status="DRAFT";item.rejectReason=null;item.updatedAt=Instant.now();return ApiResponse.ok(contents.save(item));
 }
 @PostMapping("/parent/content/{id}/review") @Transactional public ApiResponse<ContentEntity> review(@PathVariable String id){var item=mustGet(id);if(!"DRAFT".equals(item.status))throw new ResponseStatusException(HttpStatus.CONFLICT,"Must be a draft");item.status="REVIEW";return ApiResponse.ok(contents.save(item));}
 @PostMapping("/parent/content/{id}/approve") @Transactional public ApiResponse<ContentEntity> approve(@PathVariable String id){var item=mustGet(id);if(!"REVIEW".equals(item.status))throw new ResponseStatusException(HttpStatus.CONFLICT,"Must be in review");item.status="READY";item.reviewedAt=Instant.now();item.rejectReason=null;return ApiResponse.ok(contents.save(item));}
 @PostMapping("/parent/packages/publish") @Transactional public ApiResponse<Map<String,Object>> publish(){
  var ready=contents.findAll().stream().filter(x->"READY".equals(x.status)).toList();if(ready.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"No approved content");
  var version="pkg-"+UUID.randomUUID();var at=Instant.now();var snapshots=ready.stream().map(x->Map.of("id",x.id,"text",x.text,"meaningCn",x.meaningCn==null?"":x.meaningCn,"type",x.type,"assetKey",x.assetKey,"status","READY")).toList();
  try{var payload=mapper.writeValueAsString(Map.of("packageVersion",version,"publishedAt",at.toString(),"items",snapshots));packages.save(new PackageEntity(version,at,payload));return ApiResponse.ok(Map.of("packageVersion",version,"publishedAt",at,"itemCount",ready.size()));}catch(Exception ex){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Package serialization failed");}
 }
 @GetMapping("/kid/packages/latest") public ApiResponse<Object> latest(){return packages.findFirstByOrderByPublishedAtDesc().map(x->{try{return ApiResponse.ok((Object)mapper.readTree(x.payload));}catch(Exception e){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Invalid package");}}).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"No published package"));}
 private ContentEntity mustGet(String id){return contents.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Content not found"));}
 private String validType(String t){if(t==null||!Set.of("WORD","PHRASE","COMMAND","SENTENCE").contains(t))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid content type");return t;}
}