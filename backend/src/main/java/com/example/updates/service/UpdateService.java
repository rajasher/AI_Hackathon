package com.example.updates.service;

import com.example.updates.model.Update;
import com.example.updates.repository.UpdateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UpdateService {

    @Autowired
    private UpdateRepository updateRepository;

    public Update createUpdate(Update update) {
        update.setCreatedAt(LocalDateTime.now());
        return updateRepository.save(update);
    }

    public List<Update> getAllUpdates() {
        return updateRepository.findAll();
    }

    public Update getUpdate(Long id) {
        return updateRepository.findById(id).orElse(null);
    }

    public boolean deleteUpdate(Long id) {
        if (updateRepository.existsById(id)) {
            updateRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
