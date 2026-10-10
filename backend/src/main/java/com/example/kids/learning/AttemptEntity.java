package com.example.kids.learning;
import jakarta.persistence.*;
@Entity @Table(name="attempt_events")
public class AttemptEntity {
 @Id public String eventId;
 @Lob @Column(nullable=false) public String payload;
 public AttemptEntity(){}
 public AttemptEntity(String id,String payload){this.eventId=id;this.payload=payload;}
}