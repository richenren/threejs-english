package com.example.kids.ai;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
@Service
public class OpenAiCompatibleService {
 private final String baseUrl,key,model;private final HttpClient client;private final ObjectMapper mapper;private final int timeout;
 public OpenAiCompatibleService(@Value("${ai.base-url:}") String baseUrl,@Value("${ai.api-key:}") String key,@Value("${ai.model:}") String model,@Value("${ai.timeout-seconds:25}") int timeout,ObjectMapper mapper){this.baseUrl=baseUrl;this.key=key;this.model=model;this.timeout=timeout;this.mapper=mapper;this.client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(Math.min(timeout,10))).build();}
 public JsonNode suggest(String word){
  if(baseUrl.isBlank()||key.isBlank()||model.isBlank()||key.startsWith("REPLACE_"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"AI provider not configured");
  if(word==null||word.isBlank()||word.length()>200)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid input");
  try{
   String endpoint=baseUrl.replaceAll("/+$", "")+"/chat/completions";
   var messages=List.of(Map.of("role","system","content","Create child-safe English learning metadata for a 6-year-old. Return ONLY a JSON object with keys meaningCn, exampleSentence, assetKey. assetKey MUST be food.apple,food.banana,food.bread,tableware.cup,tableware.plate or empty string. Never include markdown."),Map.of("role","user","content",word));
   String body=mapper.writeValueAsString(Map.of("model",model,"messages",messages,"temperature",0.2));
   HttpRequest req=HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(timeout)).header("Authorization","Bearer "+key).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
   HttpResponse<String> resp=client.send(req,HttpResponse.BodyHandlers.ofString());if(resp.statusCode()!=200)throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"AI provider returned HTTP "+resp.statusCode());
   JsonNode root=mapper.readTree(resp.body());String resultText=root.path("choices").path(0).path("message").path("content").asText();JsonNode result=mapper.readTree(resultText);
   if(!result.isObject()||!result.hasNonNull("meaningCn")||!result.hasNonNull("exampleSentence")||!result.hasNonNull("assetKey"))throw new IllegalArgumentException("Unexpected AI JSON schema");
   String asset=result.path("assetKey").asText();if(!asset.isEmpty()&&!Set.of("food.apple","food.banana","food.bread","tableware.cup","tableware.plate").contains(asset))throw new IllegalArgumentException("Unsupported asset key");
   return result;
  }catch(ResponseStatusException ex){throw ex;}catch(Exception ex){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"AI generation failed or returned invalid JSON");}
 }
}