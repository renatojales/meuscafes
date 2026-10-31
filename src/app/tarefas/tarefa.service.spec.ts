import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, TarefaService } from './tarefa.service';

describe('TarefaService', () => {
  let service: TarefaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api' },
      ],
    });
    service = TestBed.inject(TarefaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar → GET /tarefas', () => {
    let resultado: unknown;
    service.listar().subscribe((r) => (resultado = r));
    http
      .expectOne({ method: 'GET', url: 'http://api/tarefas' })
      .flush([{ id: 1, titulo: 'a', descricao: 'b' }]);
    expect(resultado).toEqual([{ id: 1, titulo: 'a', descricao: 'b' }]);
  });

  it('incluir → POST /tarefas com o corpo', () => {
    service.incluir({ titulo: 'a', descricao: 'b' }).subscribe();
    const req = http.expectOne({ method: 'POST', url: 'http://api/tarefas' });
    expect(req.request.body).toEqual({ titulo: 'a', descricao: 'b' });
    req.flush({ id: 1, titulo: 'a', descricao: 'b' });
  });

  it('alterar → PUT /tarefas/{id}', () => {
    service.alterar(7, { titulo: 'a', descricao: 'b' }).subscribe();
    http
      .expectOne({ method: 'PUT', url: 'http://api/tarefas/7' })
      .flush({ id: 7, titulo: 'a', descricao: 'b' });
  });

  it('excluir → DELETE /tarefas/{id} (nunca GET)', () => {
    service.excluir(7).subscribe();
    http
      .expectOne({ method: 'DELETE', url: 'http://api/tarefas/7' })
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
