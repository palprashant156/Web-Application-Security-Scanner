import { AxiosResponse } from 'axios';
import { Finding } from '@webguard/shared';
import { ScannerHttpClient } from '../http/client';

export interface ScannerContext {
  url: string;
  response: AxiosResponse;
  bodyString: string;
}

export interface ScannerModule {
  name: string;
  run(context: ScannerContext): Finding[] | Promise<Finding[]>;
}

export interface FormScannerContext {
  url: string;
  action: string;
  method: string;
  inputs: string[];
}

export interface FormScannerModule {
  name: string;
  run(context: FormScannerContext): Finding[];
}

export interface ActiveScannerContext {
  url: string;
  parameter: string;
  client: ScannerHttpClient;
}

export interface ActiveScannerModule {
  name: string;
  run(context: ActiveScannerContext): Promise<Finding[]>;
}
