package com.example.unvail.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shop_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 2)
    private String grade;

    @Column(nullable = false)
    private Integer price;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "created_at", updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
    }
}
