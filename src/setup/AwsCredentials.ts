import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export class AwsCredentialsHelper {
  /**
   * Get AWS credentials using custom command or environment variables
   * 
   * Supports two approaches:
   * 1. If AWS_CREDENTIALS_COMMAND is set in .env, runs that command to retrieve credentials
   * 2. Otherwise, reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN from env vars
   */
  static async getCredentials(): Promise<AwsCredentials> {
    // Check if custom credentials command is specified
    const credentialsCommand = process.env.AWS_CREDENTIALS_COMMAND;
    
    if (credentialsCommand) {
      return this.getCredentialsFromCommand(credentialsCommand);
    } else {
      return this.getCredentialsFromEnv();
    }
  }

  /**
   * Get AWS credentials by running a custom command
   */
  private static async getCredentialsFromCommand(command: string): Promise<AwsCredentials> {
    try {
      console.log('🔑 Fetching AWS credentials using custom command...');
      
      const { stdout } = await execAsync(command);

      // Parse the output (assuming format: KEY=VALUE)
      const lines = stdout.trim().split('\n');
      const credentials: any = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          credentials[key] = value;
        }
      }

      if (!credentials.AWS_ACCESS_KEY_ID || !credentials.AWS_SECRET_ACCESS_KEY || !credentials.AWS_SESSION_TOKEN) {
        throw new Error('Failed to parse AWS credentials from command output. Expected format: KEY=VALUE');
      }

      console.log('✓ AWS credentials retrieved successfully\n');

      return {
        accessKeyId: credentials.AWS_ACCESS_KEY_ID,
        secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY,
        sessionToken: credentials.AWS_SESSION_TOKEN
      };
    } catch (error) {
      console.error('❌ Failed to get AWS credentials from command:', error);
      throw error;
    }
  }

  /**
   * Get AWS credentials from environment variables
   */
  private static getCredentialsFromEnv(): AwsCredentials {
    console.log('🔑 Reading AWS credentials from environment variables...');
    
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey || !sessionToken) {
      throw new Error(
        'Missing required AWS credentials. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN in .env or environment variables, or specify AWS_CREDENTIALS_COMMAND to fetch them dynamically.'
      );
    }

    console.log('✓ AWS credentials loaded from environment\n');

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken
    };
  }

  /**
   * Set AWS credentials as environment variables
   */
  static setEnvironmentVariables(credentials: AwsCredentials): void {
    process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
  }
}
