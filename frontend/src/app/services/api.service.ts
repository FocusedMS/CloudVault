import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface AccountDetails {
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  permanentAddress: string;
  governmentIssuedID: string;
  idNumber: string;
  accountType: string;
  balance: number;
  accountCreationDate: string;
}

export interface TransferRequest {
  destinationAccountNumber: string;
  amount: number;
  description: string;
}

export interface TransferResponse {
  message: string;
  transactionId: string;
  status: string;
}

export interface Transaction {
  transactionId: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  description: string;
  status: string;
  timestamp: string;
  sourceAccountBalance: number;
  transactionType: 'CREDIT' | 'DEBIT';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Account related endpoints
  createAccount(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/accounts/create`, data);
  }

  getAccountDetails(accountNumber: string): Observable<AccountDetails> {
    return this.http.get<AccountDetails>(`${this.apiUrl}/api/accounts/${accountNumber}`);
  }

  // Transaction related endpoints
  transferMoney(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/transactions`, data);
  }

  getTransactionHistory(accountId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/transactions/history/${accountId}`);
  }

  getTransactionHistoryForRange(accountNumber: string, fromDate: string, toDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/transactions/history/${accountNumber}?fromDate=${fromDate}&toDate=${toDate}`);
  }

  // Authentication endpoints
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/login`, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, userData);
  }

  getAccountBalance(accountNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/accounts/${accountNumber}/balance`);
  }

  createFixedDeposit(data: any) {
    return this.http.post(`${this.apiUrl}/api/fixed-deposits`, data);
  }

  getFixedDeposits(accountNumber: string) {
    return this.http.get(`${this.apiUrl}/api/fixed-deposits/account/${accountNumber}`);
  }

  downloadStatement(accountNumber: string, fromDate: string, toDate: string) {
    return this.http.post(
      `${this.apiUrl}/api/statements/${accountNumber}/download`,
      { fromDate, toDate },
      { responseType: 'blob' }
    );
  }

  transfer(request: TransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(`${this.apiUrl}/api/transactions/transfer`, request);
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/api/transactions`);
  }
} 