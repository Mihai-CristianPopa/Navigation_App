const errorMessageMissingBodyElement = " failed due to the body of the request missing the ";

const registrationErrorMessageMissingBodyElement = "Registration" + errorMessageMissingBodyElement;

const loginErrorMessageMissingBodyElement = "Login" + errorMessageMissingBodyElement;

export const registrationErrorMessageMissingEmailAddressFromBody = registrationErrorMessageMissingBodyElement + "email address.";

export const registrationErrorMessageMissingPasswordFromBody = registrationErrorMessageMissingBodyElement + "password.";

export const registrationErrorMessageUserWithEmailExists = "Registration failed because there already exists an user with this email address.";

export const loginErrorMessageMissingEmailAddressFromBody = loginErrorMessageMissingBodyElement + "email address.";

export const loginErrorMessageMissingPasswordFromBody = loginErrorMessageMissingBodyElement + "password.";

export const loginErrorMessageNoUserFoundForTheEmail = (email) => {
  `Login failed because there is no user with the email address ${email}`;
};

export const loginErrorMessageWrongPassword = (email) => {
  `Login failed due to the fact that the introduced password is wrong for the user with email address ${email}`;
};

export const loginErrorMessageWrongCredentialsFrontendFacing = "Login failed due to invalid email or password";

export const userDeletionErrorMessageMissingEmailAddressQueryParam = "User deletion failed due to email not existing as a query parameter.";

export const userDeletionSuccessMessage = (email) => {
  return `Deletion of the user with the email address ${email} was successful.`;
};

const userDeletionErrorMessageFailure = "User deletion failed for the user with the email address ";

export const userDeletionErrorMessageRequestFailedWithError = (email, error) =>{
  return userDeletionErrorMessageFailure + `${email} ` + `with the following error message ${error?.message}.`;
} 
export const userDeletionErrorMessageRequestFailed = (email) =>{
  return userDeletionErrorMessageFailure + `${email}.`;
} 

