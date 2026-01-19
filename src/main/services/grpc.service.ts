import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ServiceDefinition } from '@grpc/grpc-js/build/src/make-client';

export interface GrpcRequestOptions {
  protoFilePath: string;
  url: string;
  service: string;
  method: string;
  body: string;
}

export interface ParsedProto {
  services: {
    name: string;
    methods: string[];
  }[];
}

export class GrpcService {
  static async parseProtoFile(filePath: string): Promise<ParsedProto> {
    const packageDefinition = await protoLoader.load(filePath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition);
    const services: ParsedProto['services'] = [];

    for (const packageName of Object.keys(proto)) {
      const packageObj = proto[packageName];
      if (typeof packageObj === 'object' && packageObj !== null) {
        for (const serviceName of Object.keys(packageObj)) {
          const serviceDef = packageObj[serviceName] as ServiceDefinition;
          if (serviceDef.prototype instanceof grpc.Client) {
            services.push({
              name: `${packageName}.${serviceName}`,
              methods: Object.keys(serviceDef.prototype),
            });
          }
        }
      }
    }
    return { services };
  }

  static async makeUnaryCall(options: GrpcRequestOptions): Promise<Record<string, unknown>> {
    const packageDefinition = await protoLoader.load(options.protoFilePath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition);
    const [packageName, serviceName] = options.service.split('.');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceConstructor = (proto[packageName] as any)[serviceName];
    if (!serviceConstructor) {
      throw new Error(`Service not found: ${options.service}`);
    }

    const client = new serviceConstructor(options.url, grpc.credentials.createInsecure());
    const body = JSON.parse(options.body);

    return new Promise((resolve, reject) => {
      client[options.method](body, (error: Error | null, response: Record<string, unknown>) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}
