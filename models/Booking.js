import mongoose from "mongoose";

const BookingSchema = mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    car: {
        type: String,
        required: true
    },
    startDate: {
        type: String,
        required: true
    },
    endDate: {
        type: String,
        required: true
    },
    fare: {
        type: Number,
        required: true
    },
    paid: {
        type: Boolean,
        required: true
    }
});

export const Booking = mongoose.model("Booking", BookingSchema);