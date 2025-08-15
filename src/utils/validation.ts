import { Character, Territory, Resource, Mission, FactionType, TraitType } from '../types/game';
import { InputValidator, InputSanitizer } from './security';

/**
 * Comprehensive validation utilities for game data
 */

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validation schemas
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean;
  };
}

export class GameValidator {
  // Character validation
  static validateCharacter(character: Partial<Character>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!character.name) {
      errors.push('Character name is required');
    } else if (!InputValidator.isValidCharacterName(character.name)) {
      errors.push('Character name contains invalid characters');
    } else if (character.name.length < 3) {
      errors.push('Character name must be at least 3 characters long');
    } else if (character.name.length > 50) {
      errors.push('Character name must be less than 50 characters');
    }

    if (character.level !== undefined) {
      if (!InputValidator.isValidNumber(character.level, 1, 1000)) {
        errors.push('Character level must be between 1 and 1000');
      }
    }

    if (character.experience !== undefined) {
      if (!InputValidator.isValidNumber(character.experience, 0)) {
        errors.push('Character experience must be non-negative');
      }
    }

    if (!character.faction || !Object.values(FactionType).includes(character.faction as FactionType)) {
      errors.push('Invalid faction specified');
    }

    if (character.resources) {
      Object.entries(character.resources).forEach(([type, amount]) => {
        if (!InputValidator.isValidNumber(amount, 0)) {
          errors.push(`Invalid resource amount for ${type}`);
        }
      });
    }

    if (character.traits) {
      character.traits.forEach((trait, index) => {
        if (!Object.values(TraitType).includes(trait.type)) {
          errors.push(`Invalid trait type at index ${index}`);
        }
        if (trait.level !== undefined && !InputValidator.isValidNumber(trait.level, 1, 100)) {
          errors.push(`Invalid trait level at index ${index}`);
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Territory validation
  static validateTerritory(territory: Partial<Territory>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!territory.id || !InputValidator.isValidStringLength(territory.id, 1, 100)) {
      errors.push('Territory ID is required and must be 1-100 characters');
    }

    if (!territory.name || !InputValidator.isValidStringLength(territory.name, 1, 200)) {
      errors.push('Territory name is required and must be 1-200 characters');
    }

    if (territory.position) {
      const { x, y, z } = territory.position;
      if (!InputValidator.isValidNumber(x, -10000, 10000) ||
          !InputValidator.isValidNumber(y, -10000, 10000) ||
          !InputValidator.isValidNumber(z, -10000, 10000)) {
        errors.push('Territory position coordinates must be between -10000 and 10000');
      }
    }

    if (territory.defense !== undefined && !InputValidator.isValidNumber(territory.defense, 0, 1000)) {
      errors.push('Territory defense must be between 0 and 1000');
    }

    if (territory.population !== undefined && !InputValidator.isValidNumber(territory.population, 0, 1000000)) {
      errors.push('Territory population must be between 0 and 1,000,000');
    }

    if (territory.resources) {
      territory.resources.forEach((resource, index) => {
        const resourceValidation = this.validateResource(resource);
        if (!resourceValidation.isValid) {
          errors.push(`Resource at index ${index}: ${resourceValidation.errors.join(', ')}`);
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Resource validation
  static validateResource(resource: Partial<Resource>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!resource.type || !InputValidator.isValidStringLength(resource.type, 1, 50)) {
      errors.push('Resource type is required and must be 1-50 characters');
    }

    if (resource.amount !== undefined && !InputValidator.isValidNumber(resource.amount, 0)) {
      errors.push('Resource amount must be non-negative');
    }

    if (resource.baseValue !== undefined && !InputValidator.isValidNumber(resource.baseValue, 0)) {
      errors.push('Resource base value must be non-negative');
    }

    if (resource.quality !== undefined && !InputValidator.isValidNumber(resource.quality, 0, 10)) {
      errors.push('Resource quality must be between 0 and 10');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Mission validation
  static validateMission(mission: Partial<Mission>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mission.id || !InputValidator.isValidStringLength(mission.id, 1, 100)) {
      errors.push('Mission ID is required and must be 1-100 characters');
    }

    if (!mission.title || !InputValidator.isValidStringLength(mission.title, 1, 200)) {
      errors.push('Mission title is required and must be 1-200 characters');
    }

    if (!mission.description || !InputValidator.isValidStringLength(mission.description, 1, 1000)) {
      errors.push('Mission description is required and must be 1-1000 characters');
    }

    if (!mission.type || !InputValidator.isValidStringLength(mission.type, 1, 50)) {
      errors.push('Mission type is required and must be 1-50 characters');
    }

    if (mission.progress !== undefined && !InputValidator.isValidNumber(mission.progress, 0, 100)) {
      errors.push('Mission progress must be between 0 and 100');
    }

    if (mission.requiredLevel !== undefined && !InputValidator.isValidNumber(mission.requiredLevel, 1, 1000)) {
      errors.push('Mission required level must be between 1 and 1000');
    }

    if (mission.reward) {
      if (!mission.reward.type || !InputValidator.isValidStringLength(mission.reward.type, 1, 50)) {
        errors.push('Mission reward type is required and must be 1-50 characters');
      }
      if (!InputValidator.isValidNumber(mission.reward.amount, 0)) {
        errors.push('Mission reward amount must be non-negative');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Generic object validation using schema
  static validateWithSchema(data: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    Object.entries(schema).forEach(([field, rules]) => {
      const value = data[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      // Skip validation for optional undefined fields
      if (value === undefined || value === null) return;

      // Type validation
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}, got ${actualType}`);
          return;
        }
      }

      // Range validation for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      // Length validation for strings and arrays
      if (typeof value === 'string' || Array.isArray(value)) {
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${field} must have at least ${rules.min} characters/items`);
        }
        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must have at most ${rules.max} characters/items`);
        }
      }

      // Pattern validation for strings
      if (typeof value === 'string' && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // Custom validation
      if (rules.custom && !rules.custom(value)) {
        errors.push(`${field} failed custom validation`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }
}

// Form validation utilities
export class FormValidator {
  static validateAndSanitizeForm(formData: FormData, schema: ValidationSchema): {
    isValid: boolean;
    errors: string[];
    sanitizedData: Record<string, any>;
  } {
    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    Object.entries(schema).forEach(([field, rules]) => {
      const rawValue = formData.get(field);
      let value: any = rawValue;

      // Type conversion
      if (rawValue !== null) {
        switch (rules.type) {
          case 'number':
            value = Number(rawValue);
            if (isNaN(value)) {
              errors.push(`${field} must be a valid number`);
              return;
            }
            break;
          case 'boolean':
            value = rawValue === 'true' || rawValue === '1';
            break;
          case 'string':
            value = InputSanitizer.sanitizeGeneral(String(rawValue));
            break;
        }
      }

      // Validate using schema
      const validation = GameValidator.validateWithSchema({ [field]: value }, { [field]: rules });
      if (!validation.isValid) {
        errors.push(...validation.errors);
      } else {
        sanitizedData[field] = value;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  static createFormValidator(schema: ValidationSchema) {
    return {
      validate: (formData: FormData) => FormValidator.validateAndSanitizeForm(formData, schema),
      schema
    };
  }
}

// Common validation schemas
export const ValidationSchemas = {
  Character: {
    name: { required: true, type: 'string' as const, min: 3, max: 50, pattern: /^[a-zA-Z0-9\s\-_.]+$/ },
    level: { required: true, type: 'number' as const, min: 1, max: 1000 },
    experience: { required: true, type: 'number' as const, min: 0 },
    faction: { required: true, type: 'string' as const, enum: Object.values(FactionType) }
  },

  Territory: {
    id: { required: true, type: 'string' as const, min: 1, max: 100 },
    name: { required: true, type: 'string' as const, min: 1, max: 200 },
    defense: { type: 'number' as const, min: 0, max: 1000 },
    population: { type: 'number' as const, min: 0, max: 1000000 }
  },

  Resource: {
    type: { required: true, type: 'string' as const, min: 1, max: 50 },
    amount: { required: true, type: 'number' as const, min: 0 },
    baseValue: { type: 'number' as const, min: 0 },
    quality: { type: 'number' as const, min: 0, max: 10 }
  },

  Mission: {
    id: { required: true, type: 'string' as const, min: 1, max: 100 },
    title: { required: true, type: 'string' as const, min: 1, max: 200 },
    description: { required: true, type: 'string' as const, min: 1, max: 1000 },
    type: { required: true, type: 'string' as const, min: 1, max: 50 },
    progress: { type: 'number' as const, min: 0, max: 100 },
    requiredLevel: { type: 'number' as const, min: 1, max: 1000 }
  }
};

// React hook for form validation
export const useFormValidation = (schema: ValidationSchema) => {
  const validateField = (name: string, value: any) => {
    const fieldSchema = { [name]: schema[name] };
    return GameValidator.validateWithSchema({ [name]: value }, fieldSchema);
  };

  const validateForm = (data: Record<string, any>) => {
    return GameValidator.validateWithSchema(data, schema);
  };

  return { validateField, validateForm, schema };
};

// Export main validator
export const validator = GameValidator;
