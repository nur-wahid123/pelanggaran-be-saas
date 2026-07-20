import { Client } from 'pg'; // atau gunakan TypeORM DataSource untuk DB Lama
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SchoolEntity } from '../entities/school.entity';
import { UserEntity } from '../entities/user.entity';
import { ClassEntity } from '../entities/class.entity';
import { StudentEntity } from '../entities/student.entity';
import { ViolationTypeEntity } from '../entities/violation-type.entity';
import { ImageLinks } from '../entities/image-links.entity';
import { ImageEntity } from '../entities/image.entity';
import { ViolationEntity } from '../entities/violation.entity';

// Fungsi sederhana untuk mengubah "SMA Negeri 1 Srengat" menjadi "sma-negeri-1-srengat"
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Ganti spasi dengan -
        .replace(/[^\w\-]+/g, '')       // Hapus semua karakter non-word
        .replace(/\-\-+/g, '-');        // Ganti ganda -- dengan tunggal -
}

async function run() {
    console.log('=== MEMULAI PROSES MIGRASI DATA SEKOLAH ===');

    // Inisialisasi NestJS Application Context untuk mendapatkan database SaaS
    const app = await NestFactory.createApplicationContext(AppModule);
    const saasDataSource = app.get(DataSource);

    // Kredensial Database Lama (Read-Only)
    const oldDbConfig = {
        host: '195.88.211.49',
        port: 5432,
        user: 'postgres',
        password: 'indarakana',
        database: 'pelanggaran2',
    };

    // Buat koneksi langsung ke DB lama menggunakan pg client (Menjamin Read-Only)
    const sourceClient = new Client(oldDbConfig);
    await sourceClient.connect();
    console.log('✓ Terkoneksi ke database lama (Read-Only)');

    const queryRunner = saasDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // ----------------------------------------------------
        // LANGKAH 1: Daftarkan Sekolah Baru di SaaS
        // ----------------------------------------------------
        console.log('\n[1/7] Mendaftarkan sekolah baru di SaaS...');

        // Ambil data profil sekolah dari database lama
        const schoolProfileRows = await sourceClient.query('SELECT * FROM school_profile');
        const profileMap = new Map<string, string>();
        for (const row of schoolProfileRows.rows) {
            profileMap.set(row.name, row.value);
        }

        const schoolName = profileMap.get('SCHOOL_NAME') || 'SMK Negeri 1 Jakarta';
        const schoolAddress = profileMap.get('SCHOOL_ADDRESS') || '';
        const schoolSlug = slugify(schoolName);
        const oldLogoValue = profileMap.get('SCHOOL_LOGO');
        const oldLogoId = oldLogoValue ? Number(oldLogoValue) : null;

        const school = queryRunner.manager.create(SchoolEntity, {
            name: schoolName,
            address: schoolAddress,
            slug: `${schoolSlug}`,
            isActive: true,
            isDemo: false,
            violationLimit: 999999,
            startDate: '2024-07-17',
            violationTypeLimit: 999999,
        });
        const savedSchool = await queryRunner.manager.save(school);
        const schoolId = savedSchool.id;
        console.log(`✓ Sekolah "${schoolName}" berhasil didaftarkan dengan ID SaaS: ${schoolId}`);

        // Kamus Transmutasi ID (Lama -> Baru)
        const classIdMap = new Map<number, number>();
        const studentIdMap = new Map<number, number>();
        const userIdMap = new Map<number, number>();
        const violationTypeIdMap = new Map<number, number>();
        const imageLinkIdMap = new Map<number, number>();
        const violationIdMap = new Map<number, number>();

        // ----------------------------------------------------
        // LANGKAH 2: Migrasi Kelas
        // ----------------------------------------------------
        console.log('\n[2/7] Memigrasikan data kelas...');
        const oldClasses = await sourceClient.query('SELECT * FROM classes');
        for (const oldClass of oldClasses.rows) {
            const newClass = queryRunner.manager.create(ClassEntity, {
                name: oldClass.name,
                school: { id: schoolId },
            });
            const saved = await queryRunner.manager.save(newClass);
            classIdMap.set(oldClass.id, saved.id);
        }
        console.log(`✓ Berhasil memigrasikan ${oldClasses.rowCount} kelas`);

        // ----------------------------------------------------
        // LANGKAH 3: Migrasi Siswa
        // ----------------------------------------------------
        console.log('\n[3/7] Memigrasikan data siswa...');
        const oldStudents = await sourceClient.query('SELECT * FROM students');
        for (const oldStudent of oldStudents.rows) {

            const newStudent = queryRunner.manager.create(StudentEntity, {
                nis: oldStudent.nis,
                name: oldStudent.name,
                schoolStudentId: oldStudent.school_student_id,
                nationalStudentId: oldStudent.national_student_id,
                studentClass: { id: classIdMap.get(oldStudent.student_class_id) },
                school: { id: schoolId },
            });
            const saved = await queryRunner.manager.save(newStudent);
            studentIdMap.set(oldStudent.id, saved.id);
        }
        console.log(`✓ Berhasil memigrasikan ${oldStudents.rowCount} siswa`);

        // ----------------------------------------------------
        // LANGKAH 4: Migrasi User (Guru & Admin)
        // ----------------------------------------------------
        console.log('\n[4/7] Memigrasikan data user/guru...');
        const oldUsers = await sourceClient.query('SELECT * FROM users');
        for (const oldUser of oldUsers.rows) {
            // Cek apakah username sudah ada khusus di sekolah ini (schoolId)
            const existingUser = await queryRunner.manager.findOne(UserEntity, {
                where: {
                    username: oldUser.username,
                    school: { id: schoolId }
                }
            });
            if (existingUser) {
                console.log(`! User ${oldUser.username} sudah ada di sekolah ini. Melewati.`);
                userIdMap.set(oldUser.id, existingUser.id);
                continue;
            }

            const newUser = queryRunner.manager.create(UserEntity, {
                name: oldUser.name,
                username: oldUser.username,
                password: oldUser.password,
                email: oldUser.email,
                role: oldUser.role,
                isActive: oldUser.is_active ?? true,
                school: { id: schoolId },
            });
            const saved = await queryRunner.manager.save(newUser);
            userIdMap.set(oldUser.id, saved.id);
        }
        console.log(`✓ Berhasil memigrasikan ${oldUsers.rowCount} user`);

        // ----------------------------------------------------
        // LANGKAH 5: Migrasi Jenis Pelanggaran
        // ----------------------------------------------------
        console.log('\n[5/7] Memigrasikan jenis pelanggaran...');
        const oldVts = await sourceClient.query('SELECT * FROM violation_types');
        for (const oldVt of oldVts.rows) {
            const newVt = queryRunner.manager.create(ViolationTypeEntity, {
                name: oldVt.name,
                point: oldVt.point,
                school: { id: schoolId },
            });
            const saved = await queryRunner.manager.save(newVt);
            violationTypeIdMap.set(oldVt.id, saved.id);
        }
        console.log(`✓ Berhasil memigrasikan ${oldVts.rowCount} jenis pelanggaran`);

        // ----------------------------------------------------
        // LANGKAH 6: Migrasi Data Pelanggaran (M:N Relations)
        // ----------------------------------------------------
        console.log('\n[6/7] Memigrasikan catatan pelanggaran beserta relasinya...');
        const oldViolations = await sourceClient.query('SELECT * FROM violations');
        const violations = []
        for (const oldV of oldViolations.rows) {
            // Cari relasi siswa untuk pelanggaran ini
            const stRelation = await sourceClient.query(
                'SELECT students_id FROM violations_students_students WHERE violations_id = $1',
                [oldV.id]
            );
            const mappedStudents = stRelation.rows.map(row => ({
                id: studentIdMap.get(row.students_id)
            }));

            // Cari relasi jenis pelanggaran untuk pelanggaran ini
            const vtRelation = await sourceClient.query(
                'SELECT violation_types_id FROM violations_violation_types_violation_types WHERE violations_id = $1',
                [oldV.id]
            );
            const mappedVts = vtRelation.rows.map(row => ({
                id: violationTypeIdMap.get(row.violation_types_id)
            }));

            const newViolation = queryRunner.manager.create(ViolationEntity, {
                note: oldV.note,
                date: oldV.date,
                createdAt: oldV.created_at,
                creator: { id: userIdMap.get(oldV.creator_id) },
                students: mappedStudents,
                violationTypes: mappedVts,
                school: { id: schoolId },
            });
            violations.push(newViolation)
        }
        const savedViolations = await queryRunner.manager.save(violations)
        for (let i = 0; i < savedViolations.length; i++) {
            violationIdMap.set(oldViolations.rows[i].id, savedViolations[i].id);
        }
        console.log(`✓ Berhasil memigrasikan ${oldViolations.rowCount} catatan pelanggaran`);

        // ----------------------------------------------------
        // LANGKAH 7: Migrasi Tautan Gambar (Image Links & Images)
        // ----------------------------------------------------
        console.log('\n[7/7] Memigrasikan tautan gambar...');

        const oldImageLinks = await sourceClient.query('SELECT * FROM image_links');
        for (const oldLink of oldImageLinks.rows) {
            const oldViolationId = oldLink.violation_id;
            const newViolationId = oldViolationId ? violationIdMap.get(oldViolationId) : null;

            const newLink = queryRunner.manager.create(ImageLinks, {
                violation: newViolationId ? { id: newViolationId } : null,
            });
            const savedLink = await queryRunner.manager.save(newLink);
            imageLinkIdMap.set(oldLink.id, savedLink.id);

            // Tarik sub-gambar yang berelasi dengan image_link_id ini
            const oldImages = await sourceClient.query(
                'SELECT * FROM images WHERE image_link_id = $1',
                [oldLink.id]
            );
            for (const oldImg of oldImages.rows) {
                const newImg = queryRunner.manager.create(ImageEntity, {
                    originalName: oldImg.original_name,
                    key: oldImg.key,
                    mimetype: oldImg.mimetype,
                    size: oldImg.size,
                    imageLink: { id: savedLink.id },
                });
                await queryRunner.manager.save(newImg);
            }
        }
        console.log('✓ Berhasil memigrasikan seluruh metadata gambar');

        // Update logo sekolah jika ada
        if (oldLogoId && imageLinkIdMap.has(oldLogoId)) {
            const newLogoId = imageLinkIdMap.get(oldLogoId);
            await queryRunner.manager.update(SchoolEntity, schoolId, {
                image: newLogoId,
            });
            console.log(`✓ Berhasil menautkan logo sekolah baru dengan ID Gambar: ${newLogoId}`);
        }

        // Selesai tanpa error - Terapkan perubahan ke database SaaS
        await queryRunner.commitTransaction();
        console.log('\n🚀 MIGRASI BERHASIL SEPENUHNYA! Seluruh data terintegrasi ke SaaS.');
    } catch (error) {
        console.error('\n✗ Terjadi kesalahan. Membatalkan transaksi database...');
        await queryRunner.rollbackTransaction();
        console.error(error);
    } finally {
        await queryRunner.release();
        await sourceClient.end();
        await app.close();
    }
}

run();
