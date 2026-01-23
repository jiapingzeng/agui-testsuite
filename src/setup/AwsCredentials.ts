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
   * Get AWS credentials using ada CLI
   * @param account AWS account number
   * @param role Role to assume (default: Admin)
   * @param provider Provider (default: isengard)
   */
  static async getCredentials(
    account: string,
    role: string = 'Admin',
    provider: string = 'isengard'
  ): Promise<AwsCredentials> {
    try {
      console.log(`🔑 Fetching AWS credentials for account ${account}...`);
      
      const command = `ada credentials print --provider=${provider} --role=${role} --format=env --account=${account}`;
      const { stdout } = await execAsync(command);

      // Parse the output
      const lines = stdout.trim().split('\n');
      const credentials: any = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          credentials[key] = value;
        }
      }

      if (!credentials.AWS_ACCESS_KEY_ID || !credentials.AWS_SECRET_ACCESS_KEY || !credentials.AWS_SESSION_TOKEN) {
        throw new Error('Failed to parse AWS credentials from ada output');
      }

      console.log('✓ AWS credentials retrieved successfully\n');

      return {
        accessKeyId: credentials.AWS_ACCESS_KEY_ID,
        secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY,
        sessionToken: credentials.AWS_SESSION_TOKEN
      };
    } catch (error) {
      console.error('❌ Failed to get AWS credentials:', error);
      throw error;
    }
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
