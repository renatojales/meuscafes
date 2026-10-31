import { Component } from '@angular/core';
import { Tarefas } from './tarefas/tarefas';

@Component({
  selector: 'app-root',
  imports: [Tarefas],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
