const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class SimKaryawan extends Model {
        static associate(models) {

        }
    }
    SimKaryawan.init(
        {
            // Definisi Atribut / Kolom
            karyawanNip: {
                type: DataTypes.STRING(15),
                primaryKey: true,
                allowNull: false,
                field: "karyawan_nip",
            },
            agamaKode: {
                type: DataTypes.STRING(10),
                field: "agama_kode",
            },
            golonganKode: {
                type: DataTypes.STRING(5),
                field: "golongan_kode",
            },
            kotaKode: {
                type: DataTypes.STRING(10),
                field: "kota_kode",
            },
            karyawanKtp: {
                type: DataTypes.STRING(25),
                field: "karyawan_ktp",
            },
            karyawanKtpExpired: {
                type: DataTypes.DATEONLY,
                field: "karyawan_ktp_expired",
            },
            karyawanNama: {
                type: DataTypes.STRING(255),
                field: "karyawan_nama",
            },
            karyawanGelar: {
                type: DataTypes.STRING(100),
                field: "karyawan_gelar",
            },
            karyawanSex: {
                type: DataTypes.STRING(1),
                field: "karyawan_sex",
            },
            karyawanAlamat: {
                type: DataTypes.STRING(300),
                field: "karyawan_alamat",
            },
            karyawanKodepos: {
                type: DataTypes.STRING(5),
                field: "karyawan_kodepos",
            },
            karyawanTelp: {
                type: DataTypes.STRING(25),
                field: "karyawan_telp",
            },
            karyawanHp: {
                type: DataTypes.STRING(25),
                field: "karyawan_hp",
            },
            karyawanEmail: {
                type: DataTypes.STRING(255),
                field: "karyawan_email",
            },
            karyawanSkNo: {
                type: DataTypes.STRING(25),
                field: "karyawan_sk_no",
            },
            /**
             * Panjang username kalau bisa tidak berubah,
             * ada tabel lain yang dependasi dengan ini.
             */
            karyawanIntranet: {
                type: DataTypes.STRING(25),
                field: "karyawan_intranet",
            },
            karyawanLahirTanggal: {
                type: DataTypes.DATEONLY,
                field: "karyawan_lahir_tanggal",
            },
            karyawanLahirKota: {
                type: DataTypes.STRING(50),
                field: "karyawan_lahir_kota",
            },
            karyawanIsDosen: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "karyawan_isdosen",
            },
            karyawanStart: {
                type: DataTypes.DATEONLY,
                field: "karyawan_start",
            },
            karyawanStop: {
                type: DataTypes.DATEONLY,
                field: "karyawan_stop",
            },
            karyawanStatus: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                field: "karyawan_status",
            },
            absensiKode: {
                type: DataTypes.STRING(10),
                field: "absensi_kode",
            },
            /**
             * 0.1 = kontrak
             */
            absensiFaktor: {
                type: DataTypes.FLOAT,
                defaultValue: 1.0,
                field: "absensi_faktor",
            },
        },
        {
            // Opsi Model
            sequelize, // Menggunakan instance koneksi kedua
            modelName: "SimKaryawan",
            tableName: "tk_karyawan",
            timestamps: false, // Tidak menggunakan kolom createdAt dan updatedAt
            freezeTableName: true, // Nama tabel tidak akan diubah oleh Sequelize
        }
    );

    return SimKaryawan
}