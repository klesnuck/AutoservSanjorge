import { afterEach, beforeEach, expect, test, vi } from 'vitest';

let api;
let fetchMock;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', '');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  api = await import('./api.js');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function respondJson(body, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

test('consulta citas y devuelve los datos de la API', async () => {
  const citas = [{ id: 1, estado: 'pendiente' }];
  respondJson(citas);

  await expect(api.fetchCitas()).resolves.toEqual(citas);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/citas', {
    headers: { 'Content-Type': 'application/json' },
  });
});

test('envía una cita nueva como JSON mediante POST', async () => {
  const datos = { fecha: '2026-11-02', motivo: 'Afinación' };
  respondJson({ id: 2, ...datos }, 201);

  await expect(api.createCita(datos)).resolves.toEqual({ id: 2, ...datos });
  expect(fetchMock).toHaveBeenCalledWith('/api/citas', {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    body: JSON.stringify(datos),
  });
});

test('actualiza la cita indicada mediante PATCH', async () => {
  const datos = { estado: 'confirmada' };
  respondJson({ id: 7, ...datos });

  await api.updateCita(7, datos);
  expect(fetchMock).toHaveBeenCalledWith('/api/citas/7', {
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
    body: JSON.stringify(datos),
  });
});

test('elimina una cita y acepta una respuesta 204 sin contenido', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(api.deleteCita(7)).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledWith('/api/citas/7', {
    headers: { 'Content-Type': 'application/json' },
    method: 'DELETE',
  });
});

test('consulta cotizaciones usando su endpoint', async () => {
  respondJson([]);

  await expect(api.fetchCotizaciones()).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledWith('/api/cotizaciones', expect.any(Object));
});

test('propaga el mensaje de error JSON del servidor', async () => {
  respondJson({ error: 'Horario no disponible' }, 409);

  await expect(api.createCita({})).rejects.toThrow('Horario no disponible');
});

test('usa statusText si una respuesta de error no contiene JSON', async () => {
  fetchMock.mockResolvedValueOnce(new Response('Servicio no disponible', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  }));

  await expect(api.fetchCitas()).rejects.toThrow('Service Unavailable');
});

test('usa un mensaje genérico si el servidor no proporciona detalle', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

  await expect(api.fetchCitas()).rejects.toThrow('Error en la petición');
});

test('propaga los fallos de red para que la interfaz pueda manejarlos', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

  await expect(api.fetchCitas()).rejects.toThrow('Failed to fetch');
});

test('respeta VITE_API_URL cuando se utiliza una API externa', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com');
  vi.resetModules();
  const externalApi = await import('./api.js');
  respondJson([]);

  await externalApi.fetchCitas();
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.example.com/api/citas', expect.any(Object),
  );
});
