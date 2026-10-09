package com.example.kids.content;

import com.example.kids.common.ApiResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController @RequestMapping("/api/v1/parent/content")
public class BulkContentController {
 private final ContentRepository contents;
 public BulkContentController(ContentRepository contents){this.contents=contents;}
 public record Failure(String id,String reason){}
 public record BulkResult(int total,int succeeded,int skipped,int failed,List<Failure> failures){}
 public record BatchInput(List<String> ids,String action,String reason,String status,String search,boolean allFiltered){}
 private static final int LIMIT=5000;
 private static final Set<String> ACTIONS=Set.of("REVIEW","APPROVE","REJECT");

 @PostMapping("/import") @Transactional
 public ApiResponse<BulkResult> importCsv(@RequestParam("file") MultipartFile file) throws IOException {
  if(file.isEmpty()||file.getSize()>10*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"CSV file must be 1 byte to 10 MB");
  int total=0,created=0,skipped=0,failed=0;List<Failure> errors=new ArrayList<>();
  Set<String> known=new HashSet<>();
  contents.findAll().forEach(x->known.add(x.text.trim().toLowerCase(Locale.ROOT)));
  try(Reader reader=new InputStreamReader(file.getInputStream(),StandardCharsets.UTF_8);
      CSVParser parser=CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setIgnoreSurroundingSpaces(true).get().parse(reader)){
   var headers=parser.getHeaderMap();
   if(!headers.containsKey("text")||!headers.containsKey("meaningCn"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"CSV requires text,meaningCn headers");
   for(var row:parser){
    if(++total>LIMIT)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Maximum 5000 rows per file");
    String word=row.isSet("text")?row.get("text").trim():"";
    String cn=row.isSet("meaningCn")?row.get("meaningCn").trim():"";
    if(word.isBlank()||word.length()>200||cn.length()>500){failed++;errors.add(new Failure("line "+row.getRecordNumber(),"Invalid word or meaning"));continue;}
    String normalized=word.toLowerCase(Locale.ROOT);
    if(!known.add(normalized)){skipped++;continue;}
    try{
     contents.save(new ContentEntity(UUID.randomUUID().toString(),word,cn,"WORD","","DRAFT"));
     created++;
    }catch(RuntimeException ex){failed++;errors.add(new Failure("line "+row.getRecordNumber(),"Could not persist word"));}
   }
  }catch(IllegalArgumentException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid CSV",ex);}
  return ApiResponse.ok(new BulkResult(total,created,skipped,failed,errors));
 }

 @PostMapping("/batch-transition") @Transactional
 public ApiResponse<BulkResult> batch(@RequestBody BatchInput input){
  String action=input.action()==null?"":input.action().toUpperCase(Locale.ROOT);
  if(!ACTIONS.contains(action))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid action");
  if("REJECT".equals(action)&&(input.reason()==null||input.reason().isBlank()||input.reason().length()>500))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Reject reason required, max 500 characters");
  List<ContentEntity> selected;
  if(input.allFiltered()){
   String status=input.status()==null?"ALL":input.status();
   String search=input.search()==null?"":input.search().toLowerCase(Locale.ROOT).trim();
   selected=contents.findAll().stream().filter(x->("ALL".equals(status)||status.equals(x.status))
       &&(search.isEmpty()||x.text.toLowerCase(Locale.ROOT).contains(search)||(x.meaningCn!=null&&x.meaningCn.contains(search)))).toList();
  }else{
   if(input.ids()==null||input.ids().isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Select at least one word");
   selected=contents.findAllById(new LinkedHashSet<>(input.ids()));
  }
  if(selected.size()>LIMIT)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Maximum 5000 entries per operation");
  int ok=0;List<Failure> errors=new ArrayList<>();
  String expected="REVIEW".equals(action)?"DRAFT":"REVIEW";
  for(var item:selected){
   if(!expected.equals(item.status)){errors.add(new Failure(item.id,"Invalid status: "+item.status));continue;}
   item.status=switch(action){case "REVIEW"->"REVIEW";case "APPROVE"->"READY";default->"REJECTED";};
   item.rejectReason="REJECT".equals(action)?input.reason().trim():null;
   item.reviewedAt=Instant.now();item.updatedAt=Instant.now();
   contents.save(item);ok++;
  }
  return ApiResponse.ok(new BulkResult(selected.size(),ok,0,errors.size(),errors));
 }
}
