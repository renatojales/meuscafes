import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Tarefa, TarefaInput } from './tarefa';

/** Base da API. Em dev o `ng serve` faz proxy de /api para http://localhost:8080 (proxy.conf.json). */
export const API_URL = new InjectionToken<string>('API_URL', { factory: () => '/api' });

@Injectable({ providedIn: 'root' })
export class TarefaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_URL)}/tarefas`;

  listar(): Observable<Tarefa[]> {
    return this.http.get<Tarefa[]>(this.base);
  }

  incluir(tarefa: TarefaInput): Observable<Tarefa> {
    return this.http.post<Tarefa>(this.base, tarefa);
  }

  alterar(id: number, tarefa: TarefaInput): Observable<Tarefa> {
    return this.http.put<Tarefa>(`${this.base}/${id}`, tarefa);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
