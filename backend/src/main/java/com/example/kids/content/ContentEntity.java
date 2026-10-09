package com.example.kids.content;
import jakarta.persistence.*;
@Entity @Table(name="content_items")
public class ContentEntity {
 @Id public String id;
 @Column(nullable=false) public String text;
 public String meaningCn;
 @Column(nullable=false) public String type;
 public String assetKey;
 @Column(length=500) public String rejectReason;
 public java.time.Instant reviewedAt;
 public java.time.Instant updatedAt;
 @Column(nullable=false) public String status;
 public ContentEntity(){}
 public ContentEntity(String id,String text,String meaningCn,String type,String assetKey,String status){this.id=id;this.text=text;this.meaningCn=meaningCn;this.type=type;this.assetKey=assetKey;this.status=status;}
}