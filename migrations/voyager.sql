CREATE TABLE IF NOT EXISTS voyager (
    userId INT NOT NULL PRIMARY KEY,
    itemIds VARCHAR(500) NOT NULL DEFAULT "",
    rerolls INT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (userId) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

ALTER TABLE voyager
ADD IF NOT EXISTS pack1 TINYINT(1) NOT NULL DEFAULT 0,
ADD IF NOT EXISTS pack2 TINYINT(1) NOT NULL DEFAULT 0,
ADD IF NOT EXISTS pack3 TINYINT(1) NOT NULL DEFAULT 0,
ADD IF NOT EXISTS is_pack_purchased TINYINT(1) DEFAULT 0;
