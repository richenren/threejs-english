package com.example.kids.content;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="learning_packages")
public class PackageEntity {
 @Id public String version;
 public Instant publishedAt;
 @Lob @Column(nullable=false) public String payload;
 public PackageEntity(){}
 public PackageEntity(String version,Instant publishedAt,String payload){this.version=version;this.publishedAt=publishedAt;this.payload=payload;}
}