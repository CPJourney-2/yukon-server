CREATE TABLE popup_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    popupName VARCHAR(255) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
