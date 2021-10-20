// TODO: add unit tests
// TODO: clear code
// TODO: translation
// TODO: documentation
"use strict";

export class FlowsBuilder {
    constructor(){
        this.periodicity =
            this.periods = 
            this.amount = 
            this.startDate = null;
            this.periodUnit = 1;
    }

    of(periodUnit){
        this.periodUnit = periodUnit;
        return this;
    }

    startFrom(date){
        this.startDate = date;
        return this;
    }

    repeat(periods){
        this.periods = periods;
        return this;
    }
    
    ofAmount(amount){
        this.amount = amount;
        return this;
    }

    days(){
        this.periodicity = Periods.DAYS;
        return this;
    }

    weeks(){
        this.periodicity = Periods.WEEKS;
        return this;
    }

    months(){
        this.periodicity = Periods.MONTHS;
        return this;
    }

    years(){
        this.periodicity = Periods.YEARS;
        return this;
    };

    build(){
        return Flow.createFlows(this.periods, 
                new Periodicity(this.periodUnit,this.periodicity),
                this.amount, this.startDate);
    }

}

export class Flow{

    constructor(date = new Date(), amount = 0.0, description = ""){
        this.date = date;
        this.amount = amount;
        this.description = description;
    }

    static createFlows(n, periodicity, amount, startDate = new Date()){
        let flows = [];
        for (let i = 0; i < n; i++){
            let date = new Date(startDate);
            date.setDate(date.getDate() + i * periodicity.periods*periodicity.toDays());
            flows.push(new this(date, amount, `Test flow ${i}`));
        }
        return flows; 
    }
}

export class Cashflow {

    constructor(){
        this.flows = []
    }

    clear(){
        this.flows = []
    }

    addFlow(flow){
        this.flows.push(flow);
    }

    popFlow(){
        this.flows.pop();
    }

    removeFlow(i=0){
        this.flows.splice(i,1);
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

export class Finance{
   
    static discountAmount(amount,rate,periods){
        const dr = rate / 100;
        const discountFactor = 1 / (Math.pow(1 + dr, periods));
        const pvf = amount * discountFactor;
        return pvf;
    }


    // Returns the discounted value of an amount at the specified
    // rate during the specificed number of periods
    static PV(periods, rate, amount) {

        if ( typeof periods === "undefined" || periods === null)
            throw new Error("No periods specified");
        
        if ( typeof rate === "undefined" || isNaN(rate) || rate === null)
            throw new Error ("Rate not valid");
        
        if ( typeof amount === "undefined" || isNaN(amount) || amount === null)
            throw new Error ("Amount not valid");

        const discountFactor = 1 / Math.pow( 1 + rate, periods);

        return amount * discountFactor;
    }

    // Calculates present value of flows in the cashflow on a key date
    // Discount rate should be expressed yearly
    // Key date should be before all flow dates
    // TODO: esta funcion solo debería descontar un flujo?
    static discountFlows(cashflow, rate, keyDate) {

        if ( typeof rate === "undefined" || isNaN(rate) || rate === null)
            throw new Error ("No discount rate specified");
        
        if ( typeof keyDate === "undefined" || keyDate === null)
            throw new Error ("No key date specified");
        
        if ( typeof cashflow === "undefined" || cashflow === null)
            throw new Error ("No flows specified");

        // Validate if any flow exists
        if ( cashflow.length === 0) 
            throw new Error("No flows in Cashflow");

        // Validate if keyDate is before flows dates
        if ( cashflow.flows.some( f => { return (f.date < keyDate) }) )
            throw new Error("Key date should be before all flow dates.");

        // Present date 
        const presentDate = keyDate;
         
        // Present Value calculated as aggregation of discounted flows
        // until present date using passed discount rate
        // assuming it represents the investment payment at present date
        const flows = cashflow.flows;

        const pv = flows.reduce( (acum, f) => {
                    const periods = daysBetween(presentDate, f.date) / 365;
                    const pvf = this.PV(periods, rate, f.amount);
                    return acum + pvf;
                },0);
        return pv;
    }

    // Calculates net present value for a cashflow
    // Present date is assumed to be the date of firs flow
    // Discount rate should be expressed yearly
    static XNPV(cashflow, rate){
        try {   
            return  this.discountFlows(cashflow,rate,cashflow.flows[0].date);
        } catch (e) {
            throw e;
        }
    }
   
    
    // Calculates internal return rate (IRR) for the cashflow.
    // Flows can be non periodical.Year is are considered to be 365 days 
    // Newton Raphson iteration is used to calculate the result
    static XIRR(cashflow, initialGuess = 0.10){
        
        //this.validateFlows();
        if (! (cashflow.flows.some( f => { return f.amount > 0 } ) &&
               cashflow.flows.some( f => { return f.amount < 0 })))
            throw new 
                Error("Cashflow must contain positive and negative flows");      
        // Validate if any flow exists
        if (cashflow.flows.length === 0) 
            throw new Error("No flows in Cashflow");
        // At least one flow amount must exist with amount < 0 
        if (cashflow.flows[0].amount > 0) 
            throw new Error("No investment Flow found");

        let rate = initialGuess;
        const maxRelError = 0.00000001/100;
        const maxIterations = 10000;
        let error = Number.MAX_VALUE;
        let iterations = 0;
        const presentDate = cashflow.flows[0].date;

        let f = r => {
            const pv =  this.XNPV(cashflow, r);
            return pv;
        }
        
        let fprime = r => {
            let flows = cashflow.flows.slice(1,cashflow.flows.length);
            return flows.reduce(
                (acum,flow) => {
                    let period = daysBetween(flow.date, presentDate)/365;
                    return acum - 1*flow.amount*period*Math.pow(1+r,-period-1);
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
        
        console.debug("Iterations",iterations);
        console.debug(`Relative Error: ${(error*100).toFixed(15)}%`);
        console.debug("Rate: ",rate);

        if (iterations === maxIterations)
            throw new Error("Could not determine IRR");
     
        return Math.fround(rate);
    }
}

export const Periods = {
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

export function daysBetween(firstDate, secondDate){ 
    const oneDay = 24 * 60 * 60 * 1000; 
    const diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));
    return diffDays;
}

export function addDays(startDate,days){ 
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}


/* Sample Usage */

/*
const cashflow = new Cashflow();
// investment flow
cashflow.addFlow( new Flow(new Date(), -10000, "Disbursement"));
// repayment flows
new FlowsBuilder().startFrom(addDays(new Date(),30))
    .repeat(12).of(1).months().ofAmount(1000).build()
    .forEach(f => cashflow.addFlow(f));

// IRR calculation
Finance.XIRR(cashflow);

// NPV calculationi using 15% discount rate
Finance.XNPV(cashflow, 0.15);
*/


