import '@testing-library/jest-dom';

describe('hybridNotesApi first authenticated load', () => {
  it('switches to backend notes when auth becomes available after initialization', async () => {
    jest.resetModules();

    const mockBackendGetNotes = jest.fn().mockResolvedValue([
      {
        id: 'note-1',
        timestamp: new Date(),
        carbs: 10,
        insulin: 1,
        meal: 'Snack',
      },
    ]);
    const mockBackendTestConnection = jest.fn().mockResolvedValue(true);
    const mockStorageGetNotes = jest.fn().mockReturnValue([]);

    const mockIsAuthenticated = jest
      .fn()
      .mockReturnValueOnce(false) // constructor initialization path
      .mockReturnValue(true);     // first actual dashboard call

    jest.doMock('../authService', () => ({
      authService: {
        isAuthenticated: mockIsAuthenticated,
        getIsLoggingOut: jest.fn().mockReturnValue(false),
      },
    }));

    jest.doMock('../backendNotesApi', () => ({
      backendNotesApi: {
        testConnection: mockBackendTestConnection,
        getNotes: mockBackendGetNotes,
        createNote: jest.fn(),
      },
    }));

    jest.doMock('../notesStorage', () => ({
      notesStorageService: {
        getNotes: mockStorageGetNotes,
        clearAllNotes: jest.fn(),
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
