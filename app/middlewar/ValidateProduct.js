import { FOOD_CATEGORIES, UNITS } from "../globals.js";

const validateProduct = (req, res, next) => {
  const { sku, name, category, serving_style, unit, weight_per_unit, calories_per_unit, dosage } = req.body;

  // Check required fields
  if (!name || !sku) {
    return res.status(400).json({ error: "Missing required fields (name and SKU are required)" });
  }

  // Convert category to lowercase if it's provided
  if (category) {
    req.body.category = category.toLowerCase();
  }

  if(serving_style){
    req.body.serving_style = serving_style.toLowerCase();
  }

  // Validate category
  if (category && !FOOD_CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${FOOD_CATEGORIES.join(", ")}` });
  }

  // Validate unit
  if (unit && !UNITS.includes(unit)) {
    return res.status(400).json({ error: `Invalid unit. Must be one of: ${UNITS.join(", ")}` });
  }

  // Validate serving_style
  const validServingStyles = ["ground", "regular"];
  if (serving_style && !validServingStyles.includes(req.body.serving_style)) {
    return res.status(400).json({ error: `Invalid serving style. Must be 'ground' or 'regular'` });
  }

  // Convert SKU to uppercase (standard practice)
  req.body.sku = sku.trim().toUpperCase();

  // Validate weight_per_unit, calories_per_unit, and dosage to be >= 0
  if (weight_per_unit && weight_per_unit < 0) {
    return res.status(400).json({ error: "Weight per unit must be greater than or equal to 0" });
  }

  if (calories_per_unit && calories_per_unit < 0) {
    return res.status(400).json({ error: "Calories per unit must be greater than or equal to 0" });
  }

  if (dosage && dosage < 0) {
    return res.status(400).json({ error: "Dosage must be greater than or equal to 0" });
  }

  // If all checks pass, move to the next middleware or route handler
  next();
};

export default validateProduct;
