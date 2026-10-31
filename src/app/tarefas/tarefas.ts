import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ErroApi, LIMITES, Tarefa, TarefaInput } from './tarefa';
import { TarefaService } from './tarefa.service';

@Component({
  selector: 'app-tarefas',
  imports: [ReactiveFormsModule],
  templateUrl: './tarefas.html',
  styleUrl: './tarefas.css',
})
export class Tarefas implements OnInit {
  private readonly service = inject(TarefaService);

  protected readonly limites = LIMITES;
  protected readonly tarefas = signal<Tarefa[]>([]);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly errosServidor = signal<ErroApi['detalhes']>({});
  protected readonly editandoId = signal<number | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    titulo: ['', [Validators.required, Validators.maxLength(LIMITES.titulo)]],
    descricao: ['', [Validators.required, Validators.maxLength(LIMITES.descricao)]],
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.service.listar().subscribe({
      next: (lista) => {
        this.tarefas.set(lista);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(this.mensagem(e, 'Não foi possível carregar as tarefas.'));
        this.carregando.set(false);
      },
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados: TarefaInput = this.form.getRawValue();
    const id = this.editandoId();
    const operacao$: Observable<Tarefa> =
      id === null ? this.service.incluir(dados) : this.service.alterar(id, dados);

    this.salvando.set(true);
    this.erro.set(null);
    this.errosServidor.set({});
    operacao$.subscribe({
      next: (salva) => {
        this.tarefas.update((lista) =>
          id === null ? [...lista, salva] : lista.map((t) => (t.id === id ? salva : t)),
        );
        this.cancelar();
        this.salvando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 422) {
          this.errosServidor.set((e.error as ErroApi).detalhes ?? {});
        }
        this.erro.set(this.mensagem(e, 'Não foi possível salvar a tarefa.'));
        this.salvando.set(false);
      },
    });
  }

  protected editar(tarefa: Tarefa): void {
    this.editandoId.set(tarefa.id);
    this.form.setValue({ titulo: tarefa.titulo, descricao: tarefa.descricao });
  }

  protected cancelar(): void {
    this.editandoId.set(null);
    this.errosServidor.set({});
    this.form.reset();
  }

  protected excluir(tarefa: Tarefa): void {
    this.erro.set(null);
    this.service.excluir(tarefa.id).subscribe({
      next: () => {
        this.tarefas.update((lista) => lista.filter((t) => t.id !== tarefa.id));
        if (this.editandoId() === tarefa.id) {
          this.cancelar();
        }
      },
      error: (e: HttpErrorResponse) =>
        this.erro.set(this.mensagem(e, 'Não foi possível excluir a tarefa.')),
    });
  }

  protected invalido(campo: keyof TarefaInput): boolean {
    const controle = this.form.controls[campo];
    return (controle.invalid && controle.touched) || !!this.errosServidor()?.[campo];
  }

  private mensagem(e: HttpErrorResponse, padrao: string): string {
    const corpo = e.error as Partial<ErroApi> | null;
    return typeof corpo?.erro === 'string' ? corpo.erro : padrao;
  }
}
