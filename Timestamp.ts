export class Timestamp {
    public start: number;
    public time: number;
    public end: number;
    constructor(time: number) {
        this.start = Date.now();
        this.time = time;
        this.end = this.start + time;
    }
}