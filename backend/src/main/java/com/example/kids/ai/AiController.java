package com.example.kids.ai;
import com.example.kids.common.ApiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/parent/ai")
public class AiController {
 private final OpenAiCompatibleService service;
 public AiController(OpenAiCompatibleService service){this.service=service;}
 public record Request(@NotBlank String text){}
 @PostMapping("/suggest") public ApiResponse<JsonNode> suggest(@Valid @RequestBody Request body){return ApiResponse.ok(service.suggest(body.text()));}
}