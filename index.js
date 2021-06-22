import Express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import mongodb from "mongodb";
// import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/Users.js";
import { Booking } from "./models/Booking.js";
import Razorpay from "razorpay";

dotenv.config();
const PORT = process.env.port || 5000;
const mongoClient = mongodb.MongoClient;
const dbUrl = process.env.DBUrl || "mongodb://127.0.0.1:27017";

const app = Express();
app.use(cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

//Razorpay setup
const razorpay = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
});


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
    
        // console.log("email = " + email);
        // console.log("password = " + password);
        // console.log("hashed password = " + hashedPassword);
        
        //Saving New User data into DB
        let user = new User({
            "email": email,
            "password": hashedPassword
        });
        
        //Checking if the email id exist already in DB
        let checkUser = await db.collection("users").find({
            email: email}).count();
        
        // console.log("Check User: ", checkUser);
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
                // console.log("New user signed up:", newUser.ops[0].email);
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
        // console.log("user cred = ", user);
        
        // console.log("Check User: ", user);
        if(user == null) {
            res.status(201).json({message: "Email does not exists"});
        }
        else {
            const isMatch = await bcrypt.compare(password, user.password);
            // console.log("ismatch = ", isMatch);
            if(isMatch) {
                return res.status(200).json({message: "Login Successful"});
            }
            else {
                return res.status(202).json({message: "Incorrect password"});
            }
        }              
        client.close();
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }
});

//Saving Booking Details in DB
app.post("/book", async (req, res) => {
    let email = req.body.email;
    let car = req.body.car;
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    let fare = req.body.fare;
    let paid = req.body.paid;
    // console.log(email);
    // console.log(car);
    // console.log(startDate);
    // console.log(endDate);
    // console.log(fare);
    // console.log(paid);

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
app.post("/bookingDetails", async (req, res) => {
    let email = req.body.email;

    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");

        let booking = await db.collection("bookings").findOne({
            email: email,
            paid: false
        });
        console.log("BookingDetails = ", booking)
        if(booking == null) {
            res.json({message: "No booking"});
        }
        else if(booking) {
            res.json({message: booking});
        }
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }

});

//Updating paid to true after payment
app.post("/", async (req, res) => {
    // console.log("Put request");
    let email = req.body.email;
    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");
        const filter = {email: email};
        const updateRecord = {
            $set: {
                paid: true
            }
        };

        let booking = await db.collection("bookings").updateOne(filter, updateRecord);
        if(booking) {
            // console.log("booked and paid");
        }
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }

})

//Fetching orderID from Razorpay
app.post("/order", (req, res) => {
    let options = {
        amount: req.body.amount,  // amount in the smallest currency unit
        currency: "INR"
    };

    razorpay.orders.create(options, function(err, order) {
        // console.log(order);
        res.json(order);
    });      
});

//Checking the status of the payment
app.post("/", (req, res) => {
    razorpay.payments.fetch(req.body.razorpay_payment_id)
    .then((resp) => {
        if(resp.status == "captured") {
            return res.status(200).json("Payment successful!");
        }
        else {
            return res.status(404).json("Payment failed!");
        }
    })
});

//Fetch all users data for admin
app.get("/getUsers", async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");

        let allUsers = [];
        await db.collection("users").find().forEach((user) => {
            allUsers.push(user.email);
        });
        console.log("All users: ", allUsers);
        if(allUsers) {
            res.status(200).json(allUsers);
        }
        else {
            res.status(202).json({allUsers: "No user found."});
        }
    }
    catch(err) {
        console.log("Error: ", err);
        res.status(300).send(err);
    }
    
})

//Fetching booking history from DB
app.get("/bookingHistory", async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});
        let db = client.db("RentalServices");
        
        let bookingDetails = [];
        let bookings = db.collection("bookings").find({}).toArray((err, data) => {
            if(err) console.log("error = ", err);
            else {
                res.status(200).json({"bookings": data});
            }
        });
        console.log(bookings);
        // bookings.map((booking) => {
        //     // let details = {
        //     //     email: booking.email,
        //     //     car: booking.car,
        //     //     startDate: booking.startDate,
        //     //     endDate: booking.endDate,
        //     //     fare: booking.fare,
        //     //     payment: booking.paid ? "Paid" : "Not Paid"
        //     // };
        //     bookingDetails.push({
        //         email: booking.email,
        //         car: booking.car,
        //         startDate: booking.startDate,
        //         endDate: booking.endDate,
        //         fare: booking.fare,
        //         payment: booking.paid ? "Paid" : "Not Paid"
        //     });
        //     // console.log("Booking Details: ", bookingDetails);
        // })

        // if(bookings) {
        //     console.log("BookingDetails = ", bookings)
        //     res.status(200).json(bookingDetails);
        // }
        // else {
        //     res.status(202).json({bookings: "No booking found."});
        // }
    }
    catch(err) {
        console.log("Error = ", err);
    }
});

app.listen(PORT, () => console.log("App listening in port ", PORT));