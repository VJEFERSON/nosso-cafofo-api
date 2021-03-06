import express from 'express';
import routes from './routes';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './swagger.json';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

const morgan = require("morgan");

export default class App {
    private express: express.Application;

    constructor() {
        this.express = express();
        this.prepareEnv();
        this.middlewares();
        this.swagger();
        this.routes();
    }

    private prepareEnv() {
        dotenv.config();
        if (process.env.OVERRIDE_ENV == 'true') {
            const envConfig = dotenv.parse(fs.readFileSync('.env.prod'))
            for (const k in envConfig) {
                process.env[k] = envConfig[k]
            }
        }
    }

    private middlewares(): void {
        this.express.use(cors());
        this.express.use(express.json());
        this.express.use(morgan("dev"));
        this.express.use(
            "/files",
            express.static(path.resolve(__dirname, "..", "tmp", "uploads"))
          );
    }

    private swagger(): void {
        this.express.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    }

    private routes(): void {
        this.express.use(routes);
    }

    public start(): void {
        const porta = process.env.PORT || 3333;
        this.express.listen(porta, () => {
            console.log(process.env.NODE_ENV == 'development' ? `Server iniciado e escutando em http://localhost:${porta} !` : 'Server iniciado!');
        });
    }

}