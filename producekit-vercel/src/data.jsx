// ─── DEFAULT PROJECT DATA ────────────────────────────────────
const defaultProject = () => ({
  id: "p" + Date.now(), name: "The Letter", production: "Meridian Films", shootingDays: 20,
  keyRoles: { Director:"Anna Novak", Producer:"J. Hartwell", "Exec Producer":"M. Stone", "Line Producer":"K. Voss", UPM:"R. Tanaka", DOP:"Sarah Chen", "1st AD":"Ava Petrov" },
  crew: [
    { id:"c1", firstName:"Sarah", lastName:"Chen", name:"Sarah Chen", dept:"Camera", role:"DOP", phone:"+420 555 0101", email:"sarah@prod.com", worker:"intern", status:"confirmed", notes:"", address:"14 Oak Lane, Prague 5", hotel:"", dietary:"" },
    { id:"c2", firstName:"Mike", lastName:"Torres", name:"Mike Torres", dept:"Grip", role:"Key Grip", phone:"+420 555 0102", email:"mike@prod.com", worker:"intern", status:"confirmed", notes:"", address:"88 Vine St, Prague 3", hotel:"", dietary:"" },
    { id:"c3", firstName:"Ava", lastName:"Petrov", name:"Ava Petrov", dept:"Directing", role:"1st AD", phone:"+420 555 0103", email:"ava@prod.com", worker:"intern", status:"confirmed", notes:"", address:"22 Elm Ave, Prague 6", hotel:"", dietary:"Vegetarian" },
    { id:"c4", firstName:"James", lastName:"Okafor", name:"James Okafor", dept:"Sound", role:"Boom Op", phone:"+420 555 0104", email:"james@prod.com", worker:"extern", status:"available", notes:"", address:"5 Cedar Blvd, Prague 4", hotel:"", dietary:"" },
    { id:"c5", firstName:"Lena", lastName:"Kraft", name:"Lena Kraft", dept:"Wardrobe", role:"Costume Designer", phone:"+420 555 0105", email:"lena@prod.com", worker:"intern", status:"confirmed", notes:"", address:"31 Magnolia Dr, Prague 2", hotel:"", dietary:"" },
    { id:"c6", firstName:"Danny", lastName:"Reeves", name:"Danny Reeves", dept:"Electric", role:"Gaffer", phone:"+420 555 0106", email:"danny@prod.com", worker:"intern", status:"confirmed", notes:"", address:"7 Birch Rd, Prague 8", hotel:"", dietary:"" },
    { id:"c7", firstName:"Rosa", lastName:"Vega", name:"Rosa Vega", dept:"Hair/Makeup", role:"Key MUA", phone:"+420 555 0107", email:"rosa@prod.com", worker:"extern", status:"imported", notes:"", address:"19 Palm Way, Prague 1", hotel:"", dietary:"" },
    { id:"c8", firstName:"Tom", lastName:"Blake", name:"Tom Blake", dept:"Driver", role:"Transport Captain", phone:"+420 555 0108", email:"tom@prod.com", worker:"intern", status:"confirmed", notes:"", address:"42 Sunset Blvd, Prague 5", hotel:"", dietary:"" },
  ],
  cast: [
    { id:1, firstName:"Emily", lastName:"Frost", name:"Emily Frost", roleNum:"#1", roleName:"Diana", phone:"+420 555 0201", email:"emily@cast.com", address:"66 Melrose Ave, Prague 1", hotel:"The Roosevelt Hotel, Prague", dietary:"Vegetarian", status:"confirmed", notes:"Lead — early MU call" },
    { id:2, firstName:"Marcus", lastName:"Webb", name:"Marcus Webb", roleNum:"#2", roleName:"Jack", phone:"+420 555 0202", email:"marcus@cast.com", address:"221 Canon Dr, Prague 2", hotel:"Chateau Marmont, Prague", dietary:"", status:"confirmed", notes:"Lead" },
    { id:3, firstName:"Suki", lastName:"Tanaka", name:"Suki Tanaka", roleNum:"#3", roleName:"Rose", phone:"+420 555 0203", email:"suki@cast.com", address:"112 Hillcrest Rd, Prague 6", hotel:"", dietary:"Gluten-free", status:"confirmed", notes:"Supporting" },
    { id:4, firstName:"Dev", lastName:"Patel", name:"Dev Patel", roleNum:"#4", roleName:"Omar", phone:"+420 555 0204", email:"dev@cast.com", address:"8 Wilshire Pl, Prague 3", hotel:"", dietary:"", status:"available", notes:"Supporting" },
    { id:5, firstName:"Claire", lastName:"Duval", name:"Claire Duval", roleNum:"#5", roleName:"Waitress", phone:"+420 555 0205", email:"claire@cast.com", address:"66 Melrose Ave, Prague 1", hotel:"", dietary:"Vegan", status:"imported", notes:"Day player" },
  ],
  locations: [
    { id:"loc1", name:"Diana's Apartment", address:"Barrandov Studios, Prague 5", type:"Set/Stage", contact:"", phone:"", email:"", notes:"Main set — Stage 4", permit:true },
    { id:"loc2", name:"City Park", address:"Stromovka Park, Prague 7", type:"Exterior", contact:"Parks Dept", phone:"+420 555 8001", email:"parks@prague7.cz", notes:"Permit required", permit:true },
    { id:"loc3", name:"Restaurant", address:"Kampa Park, Prague 1", type:"Practical", contact:"Manager: Luigi", phone:"+420 555 8002", email:"luigi@kampapark.cz", notes:"Available after 14:00", permit:true },
    { id:"loc4", name:"Office (Downtown)", address:"Wenceslas Square 12, Prague 1", type:"Practical", contact:"Building Mgr", phone:"+420 555 8003", email:"office@wenceslas12.cz", notes:"Loading dock side entrance", permit:true },
    { id:"loc5", name:"Rooftop", address:"Dancing House, Prague 2", type:"Practical", contact:"Events Coord", phone:"+420 555 8004", email:"events@dancinghouse.cz", notes:"Night shoot only", permit:true },
    { id:"loc6", name:"Hospital", address:"Motol Hospital, Prague 5", type:"Practical", contact:"Film Office", phone:"+420 555 8005", email:"film@motol.cz", notes:"Restricted hours", permit:false },
    { id:"loc7", name:"Beach / River", address:"Zbraslav, Prague-South", type:"Exterior", contact:"", phone:"", email:"", notes:"River location", permit:true },
    { id:"loc8", name:"Basecamp", address:"Barrandov Terraces, Prague 5", type:"Basecamp", contact:"Lot Security", phone:"+420 555 8007", email:"security@barrandov.cz", notes:"Default crew call", permit:true },
  ],
  strips: [
    { id:"s1", scene:"1", type:"D/INT", locationId:"loc1", cast:[1,3], pages:2.5, synopsis:"Diana discovers the letter", startTime:"", endTime:"" },
    { id:"s2", scene:"2", type:"D/EXT", locationId:"loc2", cast:[1,2], pages:1.75, synopsis:"Diana and Jack meet", startTime:"", endTime:"" },
    { id:"s3", scene:"3", type:"N/INT", locationId:"loc3", cast:[1,2,5], pages:3, synopsis:"Dinner scene - the argument", startTime:"", endTime:"" },
    { id:"s4", scene:"4", type:"D/INT", locationId:"loc4", cast:[2,4], pages:1.25, synopsis:"Jack confronts Omar", startTime:"", endTime:"" },
    { id:"s5", scene:"5", type:"N/EXT", locationId:"loc5", cast:[1], pages:2, synopsis:"Diana's monologue", startTime:"", endTime:"" },
    { id:"s6", scene:"6", type:"D/EXT", locationId:"loc2", cast:[1,3,4], pages:1.5, synopsis:"Rose reveals the truth", startTime:"", endTime:"" },
    { id:"s7", scene:"7", type:"D/INT", locationId:"loc1", cast:[1,2], pages:3.25, synopsis:"Reconciliation", startTime:"", endTime:"" },
    { id:"s8", scene:"8", type:"N/INT", locationId:"loc6", cast:[1,2,3,4], pages:2.75, synopsis:"The accident aftermath", startTime:"", endTime:"" },
    { id:"s9", scene:"9", type:"D/EXT", locationId:"loc7", cast:[1,2], pages:1, synopsis:"Final scene - new beginning", startTime:"", endTime:"" },
  ],
  days: [
    { id:"d1", label:"Day 1", date:"2026-03-02", strips:["s1","s7"], callTime:"06:00" },
    { id:"d2", label:"Day 2", date:"2026-03-03", strips:["s2","s6","s9"], callTime:"07:00" },
    { id:"d3", label:"Day 3", date:"2026-03-04", strips:["s3","s5"], callTime:"14:00" },
    { id:"d4", label:"Day 4", date:"2026-03-05", strips:["s4","s8"], callTime:"06:00" },
  ],
  vehicles: [
    { id:"v1", type:"van15", plate:"CZ-PROD-01", label:"Unit Van A", driverId:"c8", color:"#3b82f6" },
    { id:"v2", type:"van8", plate:"CZ-PROD-02", label:"Cast Van", driverId:null, color:"#22c55e" },
    { id:"v3", type:"suv", plate:"CZ-PROD-03", label:"Producer Car", driverId:null, color:"#f59e0b" },
    { id:"v4", type:"motorhome", plate:"CZ-PROD-04", label:"Lead Motorhome", driverId:null, color:"#ef4444" },
    { id:"v5", type:"truck", plate:"CZ-PROD-05", label:"Grip Truck", driverId:null, color:"#8b5cf6" },
  ],
  routes: [
    { id:"r1", vehicleId:"v2", dayId:"d1", label:"Cast Pickup — Day 1",
      stops:[
        { type:"pickup", personType:"cast", personId:3, address:"112 Hillcrest Rd, Prague 6", pickupTime:"05:15", estDrive:22, distance:"", trafficNote:"" },
        { type:"pickup", personType:"cast", personId:1, address:"The Roosevelt Hotel, Prague", pickupTime:"05:40", estDrive:15, distance:"", trafficNote:"" },
        { type:"destination", locationId:"loc1", address:"Barrandov Studios, Prague 5", arrivalTime:"06:00", estDrive:0 },
      ], notes:"Emily has early MU call", status:"confirmed", optimized:false, demo:false, gmapsUrl:"", totalDrive:null, totalDistance:null, trafficSummary:"" },
    { id:"r2", vehicleId:"v1", dayId:"d1", label:"Crew Shuttle — Day 1",
      stops:[
        { type:"pickup", personType:"crew", personId:"c6", address:"7 Birch Rd, Prague 8", pickupTime:"05:00", estDrive:10, distance:"", trafficNote:"" },
        { type:"pickup", personType:"crew", personId:"c2", address:"88 Vine St, Prague 3", pickupTime:"05:15", estDrive:12, distance:"", trafficNote:"" },
        { type:"pickup", personType:"crew", personId:"c5", address:"31 Magnolia Dr, Prague 2", pickupTime:"05:30", estDrive:15, distance:"", trafficNote:"" },
        { type:"destination", locationId:"loc8", address:"Barrandov Terraces, Prague 5", arrivalTime:"05:50", estDrive:0 },
      ], notes:"", status:"confirmed", optimized:false, demo:false, gmapsUrl:"", totalDrive:null, totalDistance:null, trafficSummary:"" },
  ],
});

export { defaultProject };
