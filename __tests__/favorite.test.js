/**
 * TESTS DE FAVORITOS
 * 
 * Prueba la funcionalidad de marcar/desmarcar películas como favoritas
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

describe('API de Favoritos', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TESTS DEL TOGGLE DE FAVORITO
  // ==========================================
  describe('PATCH /api/movies/:id/favorite', () => {
    
    it('debería marcar una película como favorita', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: false,  // Actualmente NO es favorita
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = {
        ...peliculaMock,
        isFavorite: true,  // Después del toggle
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: true },  // Invirtió de false a true
      });
    });

    it('debería desmarcar una película como favorita', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        isFavorite: true,  // Actualmente SÍ es favorita
        ownerId: 'user-123',
      };

      const peliculaActualizada = {
        ...peliculaMock,
        isFavorite: false,  // Después del toggle
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
    });

    it('debería retornar 404 si la película no existe o no pertenece al usuario', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-999/favorite')
        .set('Authorization', 'Bearer fake-token');

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
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al actualizar favorito');
    });
  });
});
