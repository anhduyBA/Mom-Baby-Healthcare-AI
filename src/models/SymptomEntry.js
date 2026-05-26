import mongoose from "mongoose";


const SymptomEntrySchema = new mongoose.Schema({
  userId:{
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true
  },
  textDescription: { 
    type: String, 
    required: true 
    },

   images:{
    type: [String],
    default:[]
   },

   modelResult:{
    type: Object,
    default: []
   },
   
   severityScore:{
    type: Number, 
    min: 0,
    max: 100
   },
   alertFlag:{
    type: Boolean, 
    default: false
   }

}, { timestamps: true });


export default mongoose.model("SymptomEntry", SymptomEntrySchema);

