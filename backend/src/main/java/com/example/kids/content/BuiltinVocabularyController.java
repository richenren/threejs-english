package com.example.kids.content;

import com.example.kids.common.ApiResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/parent/content/builtin")
public class BuiltinVocabularyController {
 private final ContentRepository contents;
 public BuiltinVocabularyController(ContentRepository contents){this.contents=contents;}

 public record PackResult(int total,int created,int approved,int alreadyReady,int failed,List<String> failures){}

 @PostMapping("/common-2000/activate")
 @Transactional
 public ApiResponse<PackResult> activateCommon2000() throws IOException {
  var resource=new ClassPathResource("vocabulary/common-english-2000.csv");
  Map<String,ContentEntity> existing=new HashMap<>();
  contents.findAll().forEach(x->existing.put(x.text.trim().toLowerCase(Locale.ROOT),x));
  int total=0,created=0,approved=0,alreadyReady=0,failed=0;
  List<String> failures=new ArrayList<>();
  try(Reader reader=new InputStreamReader(resource.getInputStream(),StandardCharsets.UTF_8);
      CSVParser parser=CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setIgnoreSurroundingSpaces(true).get().parse(reader)){
   for(var row:parser){
    total++;
    String word=row.isSet("text")?row.get("text").replace("\uFEFF","").trim():"";
    String cn=row.isSet("meaningCn")?row.get("meaningCn").trim():"";
    if(word.isBlank()){failed++;failures.add("line "+row.getRecordNumber()+": empty word");continue;}
    String key=word.toLowerCase(Locale.ROOT);
    var item=existing.get(key);
    if(item==null){
      item=new ContentEntity(UUID.randomUUID().toString(),word,cn,"WORD","","READY");
      item.reviewedAt=Instant.now();item.updatedAt=Instant.now();
      contents.save(item);existing.put(key,item);created++;approved++;
    }else if("READY".equals(item.status)){
      alreadyReady++;
      if((item.meaningCn==null||item.meaningCn.isBlank())&&!cn.isBlank()){item.meaningCn=cn;item.updatedAt=Instant.now();contents.save(item);}
    }else{
      if((item.meaningCn==null||item.meaningCn.isBlank())&&!cn.isBlank())item.meaningCn=cn;
      item.status="READY";item.rejectReason=null;item.reviewedAt=Instant.now();item.updatedAt=Instant.now();
      contents.save(item);approved++;
    }
   }
  }
  return ApiResponse.ok(new PackResult(total,created,approved,alreadyReady,failed,failures));
 }
}
