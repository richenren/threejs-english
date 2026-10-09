package com.example.kids.learning;
import com.example.kids.common.ApiResponse;
import com.fasterxml.jackson.databind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequestMapping("/api/v1/kid/sync")
public class AttemptController {
 private final AttemptRepository repository;
 public AttemptController(AttemptRepository r){repository=r;}
 public record SyncRequest(List<JsonNode> events){}
 @PostMapping("/attempts") public ApiResponse<Map<String,List<String>>> sync(@RequestBody SyncRequest request){
  if(request.events()==null||request.events().size()>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Limit 100 events per batch");
  List<String> accepted=new ArrayList<>();
  for(JsonNode node:request.events()){
   String id=node.path("eventId").asText("");
   if(!id.matches("[a-zA-Z0-9-]{8,80}")||node.path("sessionId").asText().isBlank()||node.path("contentItemId").asText().isBlank())continue;
   if(!repository.existsById(id)) repository.save(new AttemptEntity(id,node.toString()));
   accepted.add(id);
  }
  return ApiResponse.ok(Map.of("acceptedEventIds",accepted));
 }
}