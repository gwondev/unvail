package com.example.unvail.repository;

import com.example.unvail.entity.ShopItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
}
