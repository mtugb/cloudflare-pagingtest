import { TOKEN_DIGITS } from "../constants/registeration";

export const generateToken = () =>
    Math.floor(Math.random() * Math.pow(10, TOKEN_DIGITS))
        .toString()
        .padStart(TOKEN_DIGITS, "0");