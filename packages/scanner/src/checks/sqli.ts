import { Finding } from '@webguard/shared';
import { v4 as uuidv4 } from 'uuid';
import { ActiveScannerContext, ActiveScannerModule } from '../engine/types';

export class SqliScanner implements ActiveScannerModule {
  name = 'SQLInjection';

  async run(context: ActiveScannerContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const payloads = [
      "'", 
      "\"", 
      "\\", 
      "1' OR '1'='1"
    ];
    
    // Common database error signatures
    const dbErrors = [
      'SQL syntax error',
      'mysql_fetch_array',
      'ORA-',
      'SQLite3::SQLException',
      'PostgreSQL query failed'
    ];

    for (const payload of payloads) {
      try {
        const url = new URL(context.url);
        url.searchParams.set(context.parameter, payload);
        
        const response = await context.client.get(url.toString());
        const bodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // Check if injecting the payload caused a database error to be returned
        const matchedError = dbErrors.find(error => bodyString.includes(error));

        if (matchedError || response.status === 500) {
           // We use 500 status combined with a payload as a weak indicator, but a matched string is stronger.
           // For our lab, the 'SQL syntax error' string will trigger this.
           
           if (matchedError) {
             findings.push({
               id: uuidv4(),
               title: 'SQL Injection Indicator Detected',
               category: 'Injection',
               severity: 'CRITICAL',
               status: 'POTENTIAL',
               description: `Injecting a SQL payload ('${payload}') into the '${context.parameter}' parameter resulted in a database error.`,
               impact: 'Attackers may be able to read, modify, or delete database contents.',
               evidence: `Injected payload: ${payload}\nDatabase error matched: ${matchedError}`,
               recommendation: 'Use parameterized queries (Prepared Statements) or an ORM for all database access. Never concatenate user input into SQL strings.',
               affectedUrl: context.url,
               affectedParameter: context.parameter,
               scannerModule: this.name,
               references: ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
               timestamp: new Date().toISOString(),
             });
             break; // Found one, no need to send more payloads for this parameter
           }
        }
      } catch (e: any) {
        // If the request fails with 500 from Axios, it might be an indicator
        if (e.message.includes('500')) {
             findings.push({
               id: uuidv4(),
               title: 'Potential SQL Injection (Server Error)',
               category: 'Injection',
               severity: 'HIGH',
               status: 'POTENTIAL',
               description: `Injecting a SQL payload ('${payload}') into the '${context.parameter}' parameter resulted in an HTTP 500 Internal Server Error.`,
               impact: 'This could indicate an unhandled database exception caused by SQL injection.',
               evidence: `Injected payload: ${payload}\nResult: HTTP 500`,
               recommendation: 'Use parameterized queries and ensure errors are gracefully handled without exposing stack traces or crashing.',
               affectedUrl: context.url,
               affectedParameter: context.parameter,
               scannerModule: this.name,
               references: ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
               timestamp: new Date().toISOString(),
             });
             break;
        }
      }
    }
    
    return findings;
  }
}
