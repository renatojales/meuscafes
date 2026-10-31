import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tarefa } from './tarefa';
import { Tarefas } from './tarefas';

const URL = '/api/tarefas';

describe('Tarefas (componente)', () => {
  let fixture: ComponentFixture<Tarefas>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const $ = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel) as T;
  const $$ = (sel: string) => Array.from(el.querySelectorAll(sel));

  async function iniciar(lista: Tarefa[] = []): Promise<void> {
    fixture.detectChanges();
    http.expectOne(URL).flush(lista);
    await fixture.whenStable();
  }

  async function preencher(titulo: string, descricao: string): Promise<void> {
    const t = $<HTMLInputElement>('#titulo');
    const d = $<HTMLTextAreaElement>('#descricao');
    t.value = titulo;
    t.dispatchEvent(new Event('input'));
    d.value = descricao;
    d.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submeter(): Promise<void> {
    $<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Tarefas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(Tarefas);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  it('exibe estado vazio', async () => {
    await iniciar();
    expect($('[data-testid=lista-vazia]')).not.toBeNull();
  });

  it('lista as tarefas carregadas', async () => {
    await iniciar([{ id: 1, titulo: 'Café', descricao: 'Moer' }]);
    expect($$('[data-testid=item-tarefa]')).toHaveLength(1);
    expect($('[data-testid=item-titulo]').textContent).toContain('Café');
  });

  it('exibe alerta quando a listagem falha', async () => {
    fixture.detectChanges();
    http.expectOne(URL).flush({ erro: 'Erro interno.' }, { status: 500, statusText: 'Erro' });
    await fixture.whenStable();
    expect($('[data-testid=alerta-erro]').textContent).toContain('Erro interno.');
  });

  it('bloqueia envio inválido no cliente sem chamar a API', async () => {
    await iniciar();
    await submeter();
    http.expectNone({ method: 'POST' });
    expect($('[data-testid=erro-titulo]').textContent).toContain('obrigatório');
    expect($('[data-testid=erro-descricao]')).not.toBeNull();
  });

  it('valida o limite de 20 caracteres do título (valor-limite)', async () => {
    await iniciar();
    await preencher('a'.repeat(21), 'ok');
    await submeter();
    http.expectNone({ method: 'POST' });
    expect($('[data-testid=erro-titulo]').textContent).toContain('Máximo de 20');
  });

  it('inclui tarefa e limpa o formulário', async () => {
    await iniciar();
    await preencher('Café', 'Moer');
    await submeter();
    http
      .expectOne({ method: 'POST', url: URL })
      .flush({ id: 9, titulo: 'Café', descricao: 'Moer' });
    await fixture.whenStable();

    expect($$('[data-testid=item-tarefa]')).toHaveLength(1);
    expect($<HTMLInputElement>('#titulo').value).toBe('');
  });

  it('exibe erros de validação devolvidos pela API (422)', async () => {
    await iniciar();
    await preencher('Café', 'Moer');
    await submeter();
    http
      .expectOne({ method: 'POST', url: URL })
      .flush(
        { erro: 'Dados inválidos.', detalhes: { titulo: 'Já existe.' } },
        { status: 422, statusText: 'Unprocessable' },
      );
    await fixture.whenStable();

    expect($('[data-testid=erro-titulo]').textContent).toContain('Já existe.');
    expect($('[data-testid=alerta-erro]').textContent).toContain('Dados inválidos.');
  });

  it('edita tarefa existente via PUT', async () => {
    await iniciar([{ id: 1, titulo: 'Café', descricao: 'Moer' }]);
    $<HTMLButtonElement>('[aria-label="Editar Café"]').click();
    await fixture.whenStable();
    expect($<HTMLInputElement>('#titulo').value).toBe('Café');

    await preencher('Espresso', 'Extrair');
    await submeter();
    http
      .expectOne({ method: 'PUT', url: `${URL}/1` })
      .flush({ id: 1, titulo: 'Espresso', descricao: 'Extrair' });
    await fixture.whenStable();

    expect($('[data-testid=item-titulo]').textContent).toContain('Espresso');
  });

  it('exclui tarefa via DELETE', async () => {
    await iniciar([{ id: 1, titulo: 'Café', descricao: 'Moer' }]);
    $<HTMLButtonElement>('[aria-label="Excluir Café"]').click();
    http
      .expectOne({ method: 'DELETE', url: `${URL}/1` })
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect($('[data-testid=lista-vazia]')).not.toBeNull();
  });
});
