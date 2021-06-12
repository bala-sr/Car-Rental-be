import Express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import mongodb from "mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/Users.js";
import { Booking } from "./models/Booking.js";

dotenv.config();
const PORT = process.env.port || 5000;
const mongoClient = mongodb.MongoClient;
const dbUrl = process.env.DBUrl || "mongodb://127.0.0.1:27017";

const app = Express();
app.use(cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));


app.get("/", (req, res) => {
    res.send("hello");
});

//Registering new users
app.post("/register", async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");
        let salt = await bcrypt.genSalt(10);
        //Hashing password
        let hashedPassword = await bcrypt.hash(password, salt);
    
        console.log("email = " + email);
        console.log("password = " + password);
        console.log("hashed password = " + hashedPassword);
        
        //Saving New User data into DB
        let user = new User({
            "email": email,
            "password": hashedPassword
        });
        
        //Checking if the email id exist already in DB
        let checkUser = await db.collection("users").find({
            email: email}).count();
        
        console.log("Check User: ", checkUser);
        if(checkUser) {
            res.status(201).json({message: "Email already exists"});
        }
        else {
            //Inserting data into DB
            let newUser = await db.collection("users").insertOne(user);

            if(!newUser) {
                res.status(202).json({message: "Unable to signup"});
            }
            else {
                console.log("New user signed up:", newUser.ops[0].email);
                res.status(200).send("Sign up successful");
                client.close();
            }                
        } 
    }
        
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }
});

app.post("/login", async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");
    
        // console.log("email = " + email);
        // console.log("password = " + password);        
        
        //Checking if the email id exist already in DB
        let user = await db.collection("users").findOne({
            email: email
        });
        
        console.log("Check User: ", user);
        if(!user) {
            res.status(201).json({message: "Email does not exists"});
        }
        else {
            const isMatch = await bcrypt.compare(password, user.password);
            if(isMatch) {
                return res.status(200).json({message: "Login Successful"});
            }
            else {
                return res.status(202).json({message: "Incorrect password"});
            }
        }              
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }
    client.close();
});

//Saving Booking Details in DB
app.post("/book", async (req, res) => {
    let email = req.body.email;
    let car = req.body.car;
    let startDate = req.body.startDate.substr(0, 10);
    let endDate = req.body.endDate.substr(0, 10);
    let fare = req.body.fare;
    let paid = req.body.paid;
    console.log(email);
    console.log(car);
    console.log(startDate);
    console.log(endDate);
    console.log(fare);
    console.log(paid)

    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");      
        
        //creating obj
        let booking = new Booking({
            "email": email,
            "car": car,
            "startDate": startDate,
            "endDate": endDate,
            "fare": fare,
            "paid": paid
        });

        let newBooking = await db.collection("bookings").insertOne(booking);

        if(newBooking) {
            return res.status(200).json({message: "Booking successful!"});
        }
        else {
            return res.status(202).json({message: "Unable to book."});
        }
        
                
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }
});

//Fetching booking details for payment
app.post("/pay", async (req, res) => {
    let email = req.body.email;

    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");

        let booking = await db.collection("bookings").findOne({
            email: email,
            paid: false
        });
        if(booking) {
            res.json({booking: booking});
        }
        else {
            res.json({message: "No booking."});
        }
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }

})


app.listen(PORT, () => console.log("App listening in port ", PORT));