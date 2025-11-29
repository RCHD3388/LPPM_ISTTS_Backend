const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class SimDosen extends Model {
        static associate(models) {

        }
    }
    SimDosen.init(
        {
            // Definisi Atribut / Kolom
            dosenKode: {
                type: DataTypes.STRING(10),
                primaryKey: true,
                allowNull: false,
                field: "dosen_kode",
            },
            dosenNamaSk: {
                type: DataTypes.STRING(255),
                field: "dosen_nama_sk",
            },
            golonganKode: {
                type: DataTypes.STRING(5),
                field: "golongan_kode",
            },
            karyawanNip: {
                type: DataTypes.STRING(11),
                allowNull: false,
                field: "karyawan_nip",
                // Catatan: Kolom ini kemungkinan besar adalah Foreign Key
                // yang merujuk ke SimKaryawan. Kita bisa mendefinisikan
                // relasi (association) antar model ini nanti.
            },
            dosenJurusanEsbed: {
                type: DataTypes.STRING(5),
                field: "dosen_jurusan_esbed",
            },
            dosenJurusanStts: {
                type: DataTypes.STRING(5),
                field: "dosen_jurusan_stts",
            },
            dosenNidn: {
                type: DataTypes.STRING(50),
                field: "dosen_nidn",
            },
            dosenStart: {
                type: DataTypes.DATEONLY,
                field: "dosen_start",
            },
            dosenStop: {
                type: DataTypes.DATEONLY,
                field: "dosen_stop",
            },
            dosenStatus: {
                type: DataTypes.INTEGER, // smallint(6) dapat direpresentasikan sebagai INTEGER
                field: "dosen_status",
            },
            dosenSertifikasi: {
                type: DataTypes.STRING(255),
                field: "dosen_sertifikasi",
            },
        },
        {
            // Opsi Model
            sequelize, // Menggunakan instance koneksi kedua
            modelName: "SimDosen",
            tableName: "tk_dosen",
            timestamps: false, // Tidak menggunakan kolom createdAt dan updatedAt
            freezeTableName: true, // Nama tabel tidak akan diubah oleh Sequelize
        }
    );

    return SimDosen
}
