/**
 * TESTS DE RATING
 * 
 * Prueba la funcionalidad de valorar películas con puntuación 0-5
 */

const request = require('supertest');

// Mock de Prisma
const mockPrisma = {
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

// Mock del middleware de autenticación
jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TESTS DEL RATING
  // ==========================================
  describe('PATCH /api/movies/:id/rating', () => {
    
    it('debería establecer un rating válido (3 estrellas)', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: false,
        rating: 0,  // Rating inicial
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = {
        ...peliculaMock,
        rating: 3,  // Después de establecer el rating
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(3);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 3 },
      });
    });

    it('debería establecer rating 5 (máximo)', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        rating: 0,
        ownerId: 'user-123',
      };

      const peliculaActualizada = {
        ...peliculaMock,
        rating: 5,
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 5 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(5);
    });

    it('debería establecer rating 0 (mínimo)', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        rating: 4,
        ownerId: 'user-123',
      };

      const peliculaActualizada = {
        ...peliculaMock,
        rating: 0,
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 0 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(0);
    });

    it('debería retornar 400 si rating es mayor a 5', async () => {
      // ARRANGE
      // No necesitamos llamar a Prisma si falla la validación

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 6 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si rating es menor a 0', async () => {
      // ARRANGE
      // No necesitamos llamar a Prisma si falla la validación

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: -1 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si rating no es un entero (es decimal)', async () => {
      // ARRANGE

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3.5 });

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería retornar 400 si rating no viene en el body', async () => {
      // ARRANGE

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El campo rating es requerido');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería retornar 404 si la película no existe o no pertenece al usuario', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-999/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería retornar 500 si ocurre un error en la base de datos', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockRejectedValue(new Error('BD error'));

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3 });

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al establecer el rating');
    });

    it('debería permitir cambiar el rating de una película ya valorada', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        rating: 3,  // Ya tiene rating 3
        ownerId: 'user-123',
      };

      const peliculaActualizada = {
        ...peliculaMock,
        rating: 5,  // Cambiar a 5
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 5 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(5);
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 5 },
      });
    });
  });
});
