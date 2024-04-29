import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

enum LogLevel {
    INFO = "INFO",
    ERROR = "ERROR",
    DEBUG = "DEBUG",
}

enum LogColor {
    INFO = "blue",
    ERROR = "red",
    DEBUG = "blue",
}

interface LoggerOptions {
    file: boolean;
    console: boolean;
}

export class Logger {
    private stream: fs.WriteStream;
    private mainStream: fs.WriteStream;
    private options: LoggerOptions;

    constructor(private PATH: string, options: LoggerOptions) {
        const error: any = new Error();
        const stackTrace = error.stack.split("\n");
        const location = stackTrace[2].trim();
        const name = path.parse(location).name;

        const logDir = path.join(PATH, name);
        fs.mkdirSync(logDir, { recursive: true });

        const logFileName = `${this.timeStampString()}.log`;
        const logFile = path.join(logDir, logFileName);
        this.stream = fs.createWriteStream(logFile, { encoding: "utf-8" });

        const mainLogFileName = `${this.timeStampString()}.log`;
        this.mainStream = fs.createWriteStream(path.join(PATH, mainLogFileName), { encoding: "utf-8" });

        this.options = options;
    }

    private timeStampString() {
        const now = new Date();
        const time = now.toLocaleTimeString().split(":").join(".");
        const date = now.toLocaleDateString().split("/").reverse().join(".");

        return `${time} ${date}`;
    }

    public info(message: any) {
        const error: any = new Error();
        const stackTrace = error.stack.split("\n");
        const location = stackTrace[2].trim();
        this.log(LogLevel.INFO, message, location);
    }

    public error(message: any) {
        const error: any = new Error();
        const stackTrace = error.stack.split("\n");
        const location = stackTrace[2].trim();
        this.log(LogLevel.ERROR, message, location);
    }

    public debug(message: any) {
        const error: any = new Error();
        const stackTrace = error.stack.split("\n");
        const location = stackTrace[2].trim();
        this.log(LogLevel.DEBUG, message, location);
    }

    private log(level: LogLevel, message: any, location: string) {
        const PATH = path.parse(location)
        const logEntry = `[${this.timeStampString()} ${PATH.base}] [${level}]`;

        if (this.options.file) {
            const fileEntry = `${logEntry} ${message}\n`;
            this.mainStream.write(fileEntry);
            this.stream.write(fileEntry);
        }

        if (this.options.console) {
            const color = LogColor[level];
            const coloredLogEntry = chalk[color].bold(logEntry);
            console.log(`${coloredLogEntry}`, message);
        }
    }
}
