// TODO: add unit tests
// TODO: clear code
// TODO: translation
// TODO: documentation
"use strict";

class Flow{

    constructor(date = new Date(), amount = 0.0, description = ""){
        this.date = date;
        this.amount = amount;
        this.description = description;
    }

    static createFlows(n, periodicity, monto, startDate = new Date()){
        let flows = [];
        for (let i = 0; i < n; i++){
            let date = new Date(startDate);
            date.setDate(date.getDate() + i * periodicity.periods*periodicity.toDays());
            flows.push(new this(date, monto, `Test flow ${i}`));
        }
        return flows; 
    }
}

class Cashflow {

    constructor(){
        this.flows = []
    }

    clear(){
        this.flows = []
    }

    addFlow(flow){
        this.flows.push(flow);
    }
    
    discountAmount(amount,rate,periods){
        let dr = rate / 100;
        let discountFactor = 1 / (Math.pow(1 + dr, periods));
        let pvf = amount * discountFactor;
        return pvf;
    }
  

    //TODO: cambiar por metodo que calcule el PV de un flow i a una fecha X
    //TODO: luego se puede utilizar para calcular el NPV 
    // Calculates present value of current flows
    // Discount rate should be expressed yearly
    PV(rate) {
        if (typeof rate === "undefined" || isNaN(rate) || rate === null)
            throw new Error ("No discount rate specified");

        this.validateFlows();
        
        // Present date assumed to be the first flow date
        let presentDate = this.flows[0].date;
         
        // Present Value calculated as aggregation of discounted flows
        // until present date using passed discount rate
        // assuming it represents the investment payment at present date
        let flows = this.flows.slice(1, this.flows.length);

        let pv = flows.reduce( (acum, f) => {
                    let periods = daysBetween(presentDate, f.date) / 365;
                    let pvf = this.discountAmount(f.amount, rate, periods);
                    //console.log("PVi: ", pvf);
                    return acum + pvf;
                },0);
        return pv;
    }

    // Calculates net present value of current flows
    // Discount rate should be expressed yearly
    NPV(rate){
        if (typeof rate === "undefined" || isNaN(rate) || rate === null)
            throw new Error ("No discount rate specified");
        if (this.flows.length === 0)
            throw new Error ("There are no flows in the cashflow");
        return this.flows[0].amount + this.PV(rate);
    }
   
    
    // Calculates internal return rate (IRR) for the cashflow.
    // Flows can be non periodical. Newton Raphson iteration
    // is used to calculate the result
    IRR(initialGuess = 10){
        
        this.validateFlows();
        if (! (this.flows.some( f => { return f.amount > 0 } ) &&
               this.flows.some( f => { return f.amount < 0 })))
            throw new 
                Error("Cashflow must contain positive and negative flows");      

        let rate = initialGuess;
        const maxRelError = 0.000001/100;
        const maxIterations = 10000;
        let error = 1000000;
        let iterations = 0;
        let presentDate = this.flows[0].date;
        let cashflow = this;

        let f = r => {
            return cashflow.NPV(r);
        }
        
        let fprime = r => {
            let flows = cashflow.flows.slice(1,cashflow.length);
            return flows.reduce(
                (acum,flow) => {
                    let period = daysBetween(flow.date, presentDate)/365;
                    return -1*flow.amount*period*Math.pow((1+r/100),-period-1);
                },0);
        }

        console.time("IRR calculation");
        while ((iterations < maxIterations) && ( error > maxRelError)){
            let oldRate = rate;
            rate = rate - f(rate)/fprime(rate);
            error = Math.abs((rate-oldRate)/rate);
            iterations++;
        }
        console.timeEnd("IRR calculation");
        
        console.log("Iterations",iterations);
        console.log(`Relative Error: ${error*100}%`);
        console.log("Rate: ",rate);

        if (iterations === maxIterations)
            throw new Error("Could not determine IRR");
     
        return Math.fround(rate);
    }
   
    validateFlows(){
        // Validate if any flow exists
        if (this.flows.length === 0) 
            throw new Error("No flows in Cashflow");
        // At least one flow amount must exist with amount < 0 
        if (this.flows[0].amount > 0) 
            throw new Error("No investment Flow found");
    }
    
    print(){
        const table = [];
        for (let f of this.flows){
            //console.log(` ${f.date.toLocaleDateString()} ${f.amount} ${f.description}`);
            table.push([f.date.toLocaleDateString(), f.amount, f.description]);
        }
            console.table(table);
    }
}


const Periods = {
    DAYS:1,
    WEEKS:2,
    MONTHS:3,
    YEARS:4
}

class Periodicity {

    constructor(periods, periodType){
       this.periods = periods,
       this.periodType = periodType
    }

    static days(n){
        return new this(n,Periods.DAYS);
    }

    static weeks(n){
        return new this(n,Periods.WEEKS);
    }

    static months(n){
        return new this(n,Periods.MONTHS);
    }
    
    static years(n){
        return new this(n,Periods.YEARS);
    }

    toDays(){
        switch (this.periodType){
            case Periods.DAYS:
                return 1;
                break;
            case Periods.WEEKS:
                return 7;
                break;
            case Periods.MONTHS:
                return 30;
                break;
            case Periods.YEARS:
                return 365;
                break;
        }
    }

}

Object.freeze(Periods);

function daysBetween(firstDate, secondDate){ 
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
    return diffDays;
}

function addDays(startDate,days){ 
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}

let flow2 = new Flow(new Date(), -100.00, "Capital");
let flow3 = new Flow(addDays(new Date(),180), 35.00, "Capital");
let flow4 = new Flow(addDays(new Date(),365), 35.00, "Capital");
let flow5 = new Flow(addDays(new Date(),365+180), 35.00, "Capital");


let cashflow = new Cashflow();

cashflow.addFlow(flow2);
cashflow.addFlow(flow3);
cashflow.addFlow(flow4);
cashflow.addFlow(flow5);
cashflow.print();


