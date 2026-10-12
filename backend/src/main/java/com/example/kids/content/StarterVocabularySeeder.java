package com.example.kids.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

/** Idempotent bundled demo content. Does not overwrite existing words or published packages. */
@Component
public class StarterVocabularySeeder implements CommandLineRunner {
    private final ContentRepository contents;
    private final PackageRepository packages;
    private final ObjectMapper mapper;
    public StarterVocabularySeeder(ContentRepository contents, PackageRepository packages, ObjectMapper mapper) {
        this.contents=contents; this.packages=packages; this.mapper=mapper;
    }
    @Override @Transactional public void run(String... args) throws Exception {
        String[][] examples = {
            {"apple","苹果","food.apple"},
            {"banana","香蕉","food.banana"},
            {"bread","面包","food.bread"},
            {"cup","杯子","tableware.cup"},
            {"plate","盘子","tableware.plate"}
        };
        for (String[] row : examples) {
            if (!contents.existsByTextIgnoreCase(row[0])) {
                contents.save(new ContentEntity("starter-"+row[0],row[0],row[1],"WORD",row[2],"READY"));
            }
        }
        // Only initialize a published version on a brand-new database.
        if (packages.count() == 0) {
            List<Map<String,String>> items = new ArrayList<>();
            for (String[] row : examples) {
                items.add(Map.of("id","starter-"+row[0],"text",row[0],
                    "meaningCn",row[1],"type","WORD","assetKey",row[2],"status","READY"));
            }
            Instant at=Instant.now();
            String version="starter-kitchen-v1";
            String payload=mapper.writeValueAsString(Map.of(
                "packageVersion",version,"publishedAt",at.toString(),"items",items));
            packages.save(new PackageEntity(version,at,payload));
        }
    }
}
