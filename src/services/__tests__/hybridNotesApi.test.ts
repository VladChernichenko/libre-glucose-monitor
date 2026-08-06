import { vi } from 'vitest';
import '@testing-library/jest-dom';

describe('hybridNotesApi first authenticated load', () => {
  it('switches to backend notes when auth becomes available after initialization', async () => {
    vi.resetModules();

    const mockBackendGetNotes = vi.fn().mockResolvedValue([
      {
        id: 'note-1',
        timestamp: new Date(),
        carbs: 10,
        insulin: 1,
        meal: 'Snack',
      },
    ]);
    const mockBackendTestConnection = vi.fn().mockResolvedValue(true);
    const mockStorageGetNotes = vi.fn().mockReturnValue([]);

    const mockIsAuthenticated = vi
      .fn()
      .mockReturnValueOnce(false) // constructor initialization path
      .mockReturnValue(true);     // first actual dashboard call

    vi.doMock('../authService', () => ({
      authService: {
        isAuthenticated: mockIsAuthenticated,
        getIsLoggingOut: vi.fn().mockReturnValue(false),
      },
    }));

    vi.doMock('../backendNotesApi', () => ({
      backendNotesApi: {
        testConnection: mockBackendTestConnection,
        getNotes: mockBackendGetNotes,
        createNote: vi.fn(),
      },
    }));

    vi.doMock('../notesStorage', () => ({
      notesStorageService: {
        getNotes: mockStorageGetNotes,
        clearAllNotes: vi.fn(),
      },
    }));

    const { hybridNotesApiService } = await import('../hybridNotesApi');
    const notes = await hybridNotesApiService.getNotes();

    expect(mockBackendTestConnection).toHaveBeenCalled();
    expect(mockBackendGetNotes).toHaveBeenCalledTimes(1);
    expect(mockStorageGetNotes).toHaveBeenCalled();
    expect(notes).toHaveLength(1);
  });
});
