export const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const years=[2022,2023,2024,2025,2026];
export const parameters=[
 {scope:'Scope 1',slug:'lpg-14kg',name:'LPG 14kg',unit:'kg',factor:0.003},
 {scope:'Scope 1',slug:'lpg-50kg',name:'LPG 50kg',unit:'kg',factor:0.003},
 {scope:'Scope 1',slug:'diesel',name:'Diesel',unit:'L',factor:2.68},
 {scope:'Scope 1',slug:'petrol',name:'Petrol',unit:'L',factor:2.31},
 {scope:'Scope 2',slug:'electricity',name:'Electricity',unit:'kWh',factor:0.101683},{scope:'Scope 2',slug:'solar',name:'Solar',unit:'kWh',factor:0}
];
export const demo={
 diesel:[2998.12,2567.99,2574.14,3022.72,3117.61,2816.58,3248.36,0,0,0,0,0],
 petrol:[2781.6,2688.3,2084.84,2830.7,2913.46,2893.38,3894.39,0,0,0,0,0],
 electricity:[866407.8,701698.5,776054.2,898912.7,869132.7,835781.2,915448.6,0,0,0,0,0]
} as Record<string,number[]>;
