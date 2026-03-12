package com.services.impl;

import com.dtos.UserCreateDTO;
import com.dtos.UserDTO;
import com.dtos.UserPasswordDTO;
import com.entities.User;
import com.mappers.UserMapper;
import com.repositories.UserRepository;
import com.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation de {@link UserService}.
 * Orchestre les appels au {@link UserRepository}
 * et les conversions via le {@link UserMapper}.
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * {@inheritDoc}
     */
    @Override
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        return userMapper.toDTO(user);
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO createUser(UserCreateDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email déjà utilisé : " + dto.getEmail());
        }
        User user = userMapper.toEntityFromCreate(dto);
        return userMapper.toDTO(userRepository.save(user));
    }

    /** {@inheritDoc} */
    @Override
    public UserDTO updateUser(Long id, UserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        user.setEmail(dto.getEmail());
        user.setPseudo(dto.getPseudo());
        user.setLastName(dto.getLastName());
        user.setFirstName(dto.getFirstName());
        return userMapper.toDTO(userRepository.save(user));
    }

    /** {@inheritDoc} */
    @Override
    public void changePassword(Long id, UserPasswordDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + id));
        if (!user.getPassword().equals(dto.getOldPassword())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }
        user.setPassword(dto.getNewPassword());
        userRepository.save(user);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Utilisateur introuvable : " + id);
        }
        userRepository.deleteById(id);
    }
}