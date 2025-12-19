// src/app/services/student.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PagedResult, Student } from '../models/student.model';

const baseUrl = 'http://localhost:8080/api/students';

@Injectable({ providedIn: 'root' })
export class StudentService {
  constructor(private http: HttpClient) {}

  getAllPaged(): Observable<PagedResult<Student>> {
    return this.http.get<PagedResult<Student>>(baseUrl);
  }

  findByNamePaged(name: string): Observable<PagedResult<Student>> {
    const params = new HttpParams().set('name', name);
    return this.http.get<PagedResult<Student>>(baseUrl, { params });
  }
  getAll(): Observable<Student[]> {
    return this.http
      .get<PagedResult<Student>>(baseUrl)
      .pipe(map((res) => res.items ?? []));
  }

  findByName(name: string): Observable<Student[]> {
    const params = new HttpParams().set('name', name);
    return this.http
      .get<PagedResult<Student>>(baseUrl, { params })
      .pipe(map((res) => res.items ?? []));
  }

  // ---------- CRUD ----------
  get(id: number | string): Observable<Student> {
    return this.http.get<Student>(`${baseUrl}/${id}`);
  }
  create(data: Student): Observable<Student> {
    return this.http.post<Student>(baseUrl, data);
  }
  update(id: number | string, data: Student): Observable<any> {
    return this.http.put<any>(`${baseUrl}/${id}`, data);
  }
  delete(id: number | string): Observable<any> {
    return this.http.delete<any>(`${baseUrl}/${id}`);
  }
  deleteAll(): Observable<any> {
    return this.http.delete<any>(baseUrl);
  }
}