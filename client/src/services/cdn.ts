import axios from 'axios';
import type { CoursesResponse } from './courses';

export class CdnService {
  constructor(private client = axios.create({ baseURL: process.env.CDN_HOST || '', withCredentials: true })) {}

  public async getCourses() {
    try {
      const result = await this.client.get<CoursesResponse>(`/api/courses`);
      return result.data.data;
    } catch (e) {
      return [];
    }
  }

  public async registerStudent(payload: any) {
    try {
      const result = await this.client.post<CoursesResponse>(`/api/registry`, payload);
      return result.data.data;
    } catch (e) {
      return [];
    }
  }

  public async registerMentor(payload: any) {
    try {
      const result = await this.client.post<CoursesResponse>(`/api/registry/mentor`, payload);
      return result.data.data;
    } catch (e) {
      return [];
    }
  }
}
