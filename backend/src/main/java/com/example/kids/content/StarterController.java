package com.example.kids.content;
import com.example.kids.common.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
@RestController @RequestMapping("/api/v1/public") public class StarterController {
 @GetMapping("/health") public ApiResponse<Map<String,String>> health(){return ApiResponse.ok(Map.of("status","UP"));}
 @GetMapping("/starter-items") public ApiResponse<List<Map<String,String>>> items(){return ApiResponse.ok(List.of(
 Map.of("id","apple","text","apple","meaningCn","苹果","assetKey","food.apple"),
 Map.of("id","banana","text","banana","meaningCn","香蕉","assetKey","food.banana"),
 Map.of("id","cup","text","cup","meaningCn","杯子","assetKey","tableware.cup"),
 Map.of("id","plate","text","plate","meaningCn","盘子","assetKey","tableware.plate")));}
}