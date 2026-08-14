-- CreateTable
CREATE TABLE `BookingCounter` (
    `name` VARCHAR(191) NOT NULL,
    `nextNumber` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
