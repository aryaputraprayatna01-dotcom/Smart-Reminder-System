import { Servis, AnalysisResult, Reminder } from './types';

export class RuleBasedEngine {
  private static readonly DEFAULT_HARI = 'Selasa';
  private static readonly DEFAULT_WAKTU: 'Pagi' | 'Siang' | 'Sore' = 'Pagi';


 
  static analyzePerilakuKonsumen(
    servisList: Servis[]
  ): AnalysisResult {

    // Pelanggan baru / belum memiliki riwayat servis
    if (servisList.length === 0) {
      return {
        frekuensi: 'Sedang',
        intensitas: 'Sedang',
        preferensiHari: this.DEFAULT_HARI,
        preferensiWaktu: this.DEFAULT_WAKTU
      };
    }

    const frekuensi =
      this.hitungFrekuensi(servisList);

    const intensitas =
      this.hitungIntensitas(servisList);

    const preferensiHari =
      this.hitungPreferensiHari(servisList);

    const preferensiWaktu =
      this.hitungPreferensiWaktu(servisList);

    return {
      frekuensi,
      intensitas,
      preferensiHari,
      preferensiWaktu
    };
  }


  // ============================================================
  // FREKUENSI SERVIS
  // ============================================================

  private static hitungFrekuensi(
    servisList: Servis[]
  ): 'Rendah' | 'Sedang' | 'Tinggi' {


    if (servisList.length < 2) {
      return 'Sedang';
    }


    // Urutkan data servis berdasarkan tanggal
    const sortedServis =
      [...servisList].sort(
        (a, b) =>
          new Date(a.tanggalServis).getTime() -
          new Date(b.tanggalServis).getTime()
      );



    const semuaInterval: number[] = [];


    for (
      let i = 1;
      i < sortedServis.length;
      i++
    ) {

      const tanggalSebelumnya =
        new Date(
          sortedServis[i - 1].tanggalServis
        );

      const tanggalSekarang =
        new Date(
          sortedServis[i].tanggalServis
        );


      if (
        isNaN(tanggalSebelumnya.getTime()) ||
        isNaN(tanggalSekarang.getTime())
      ) {
        continue;
      }


      const selisihHari =
        Math.round(
          (
            tanggalSekarang.getTime() -
            tanggalSebelumnya.getTime()
          ) /
          (1000 * 60 * 60 * 24)
        );


      if (selisihHari > 0) {
        semuaInterval.push(selisihHari);
      }
    }


    // Jika tidak ada interval yang valid
    if (semuaInterval.length === 0) {
      return 'Sedang';
    }


    const intervalTerakhir =
      semuaInterval.slice(-2);


    const totalInterval =
      intervalTerakhir.reduce(
        (total, nilai) => total + nilai,
        0
      );


    const rataRataJarakServis =
      totalInterval /
      intervalTerakhir.length;


 

    if (rataRataJarakServis <= 45) {
      return 'Tinggi';
    }

    if (rataRataJarakServis <= 75) {
      return 'Sedang';
    }

    return 'Rendah';
  }


  // INTENSITAS PENGGUNAAN KENDARAAN


  private static hitungIntensitas(
    servisList: Servis[]
  ): 'Rendah' | 'Sedang' | 'Tinggi' {

  

    if (servisList.length < 2) {
      return 'Sedang';
    }


    // Urutkan berdasarkan tanggal servis
    const sortedServis =
      [...servisList].sort(
        (a, b) =>
          new Date(a.tanggalServis).getTime() -
          new Date(b.tanggalServis).getTime()
      );

    const servisSebelumnya =
      sortedServis[
        sortedServis.length - 2
      ];

    const servisTerakhir =
      sortedServis[
        sortedServis.length - 1
      ];


    const selisihKm =
      servisTerakhir.kilometer -
      servisSebelumnya.kilometer;


    /*
     * Jika selisih kilometer tidak valid,
     * gunakan kategori Sedang sebagai default.
     */

    if (
      !Number.isFinite(selisihKm) ||
      selisihKm < 0
    ) {
      return 'Sedang';
    }


    /*
     * ATURAN INTENSITAS
     */

    if (selisihKm <= 800) {
      return 'Rendah';
    }

    if (selisihKm <= 1200) {
      return 'Sedang';
    }

    return 'Tinggi';
  }


  // ============================================================
  // PREFERENSI HARI SERVIS
  // ============================================================

  private static hitungPreferensiHari(
    servisList: Servis[]
  ): string {

    /*
     * Preferensi hari reminder mengikuti
     */

    if (servisList.length === 0) {
      return this.DEFAULT_HARI;
    }


    // Urutkan berdasarkan tanggal servis
    const sortedServis =
      [...servisList].sort(
        (a, b) =>
          new Date(a.tanggalServis).getTime() -
          new Date(b.tanggalServis).getTime()
      );


    // Ambil servis terakhir
    const servisTerakhir =
      sortedServis[
        sortedServis.length - 1
      ];


    return servisTerakhir.hariServis;
  }


  // PREFERENSI WAKTU SERVIS

  private static hitungPreferensiWaktu(
    servisList: Servis[]
  ): 'Pagi' | 'Siang' | 'Sore' {

    if (servisList.length === 0) {
      return this.DEFAULT_WAKTU;
    }


    const waktuCount:
      Record<string, number> = {};


    servisList.forEach(servis => {

      const waktu =
        servis.waktuServis;

      waktuCount[waktu] =
        (waktuCount[waktu] || 0) + 1;

    });


    let maxCount = 0;

    let preferensiWaktu:
      'Pagi' |
      'Siang' |
      'Sore' =
      this.DEFAULT_WAKTU;


    Object.entries(waktuCount)
      .forEach(([waktu, count]) => {

        if (count > maxCount) {

          maxCount = count;

          preferensiWaktu =
            waktu as
              | 'Pagi'
              | 'Siang'
              | 'Sore';
        }

      });


    return preferensiWaktu;
  }



  /*
  Menghitung estimasi servis berikutnya
  berdasarkan RATA-RATA MAKSIMAL 2 INTERVAL SERVIS TERAKHIR.
   */

  static hitungPredictedNextService(
    servisList: {
      tanggalServis: any
    }[],
    lastServiceDate: Date
  ): Date {

    const next =
      new Date(lastServiceDate);


    /*
     * Pelanggan baru / hanya memiliki 1 riwayat.
     */

    if (
      !servisList ||
      servisList.length < 2
    ) {

      next.setDate(
        next.getDate() + 30
      );

      return next;
    }


    // Urutkan berdasarkan tanggal
    const sorted =
      [...servisList].sort(
        (a, b) => {

          const da =
            new Date(
              a.tanggalServis
            ).getTime();

          const db =
            new Date(
              b.tanggalServis
            ).getTime();

          return da - db;
        }
      );


    /*
     * Simpan semua interval servis
     */

    const semuaInterval: number[] = [];


    for (
      let i = 1;
      i < sorted.length;
      i++
    ) {

      const prev =
        new Date(
          sorted[i - 1]
            .tanggalServis
        );


      const curr =
        new Date(
          sorted[i]
            .tanggalServis
        );


      if (
        isNaN(prev.getTime()) ||
        isNaN(curr.getTime())
      ) {
        continue;
      }


      const selisih =
        Math.round(
          (
            curr.getTime() -
            prev.getTime()
          ) /
          (1000 * 60 * 60 * 24)
        );


      if (selisih > 0) {
        semuaInterval.push(selisih);
      }
    }


    /*
     * Jika interval tidak dapat dihitung,
     * gunakan fallback 30 hari.
     */

    if (semuaInterval.length === 0) {

      next.setDate(
        next.getDate() + 30
      );

      return next;
    }


    /*
     * Ambil maksimal 2 interval  servis terakhir.
    */

    const intervalTerakhir =
      semuaInterval.slice(-2);


    /*
     * Hitung rata-rata interval terakhir.
     */

    const totalInterval =
      intervalTerakhir.reduce(
        (total, nilai) => total + nilai,
        0
      );


    const rataInterval =
      Math.round(
        totalInterval /
        intervalTerakhir.length
      );


    /*
     * Tambahkan rata-rata interval
     * ke tanggal servis terakhir.
     */

    next.setDate(
      next.getDate() +
      rataInterval
    );


    return next;
  }


  // MENENTUKAN WAKTU REMINDER

  static tentukanReminderTiming(
    analisis: AnalysisResult
  ): {
    jarakWaktu:
      'H-2' | 'H-5' | 'H-7';

    hariPengiriman: string;

    waktuPengiriman:
      'Pagi' | 'Siang' | 'Sore';
  } {

    const jarakWaktu =
      this.tentukanJarakWaktu(
        analisis.frekuensi,
        analisis.intensitas
      );


    return {

      jarakWaktu,

      hariPengiriman:
        analisis.preferensiHari,

      waktuPengiriman:
        analisis.preferensiWaktu

    };
  }


  // RULE-BASED REMINDER

  private static tentukanJarakWaktu(
    frekuensi:
      'Rendah' |
      'Sedang' |
      'Tinggi',

    intensitas:
      'Rendah' |
      'Sedang' |
      'Tinggi'

  ):
    'H-2' |
    'H-5' |
    'H-7' {


    // FREKUENSI TINGGI

    if (
      frekuensi === 'Tinggi' &&
      intensitas === 'Tinggi'
    ) {

      return 'H-5';
    }


    if (
      frekuensi === 'Tinggi' &&
      intensitas === 'Sedang'
    ) {

      return 'H-2';
    }


    if (
      frekuensi === 'Tinggi' &&
      intensitas === 'Rendah'
    ) {

      return 'H-2';
    }

    // FREKUENSI SEDANG

    if (
      frekuensi === 'Sedang' &&
      intensitas === 'Tinggi'
    ) {

      return 'H-7';
    }


    if (
      frekuensi === 'Sedang' &&
      intensitas === 'Sedang'
    ) {

      return 'H-5';
    }


    if (
      frekuensi === 'Sedang' &&
      intensitas === 'Rendah'
    ) {

      return 'H-5';
    }


    // FREKUENSI RENDAH

    if (
      frekuensi === 'Rendah' &&
      intensitas === 'Tinggi'
    ) {

      return 'H-7';
    }


    if (
      frekuensi === 'Rendah' &&
      intensitas === 'Sedang'
    ) {

      return 'H-7';
    }


    if (
      frekuensi === 'Rendah' &&
      intensitas === 'Rendah'
    ) {

      return 'H-5';
    }


    // Default
    return 'H-5';
  }


  // ============================================================
  // GENERATE REMINDER
  // ============================================================

  static generateReminder(
    pelangganId: string,
    servisList: Servis[]
  ): Omit<
    Reminder,
    'id' | 'tanggalDibuat'
  > {

    const analisis =
      this.analyzePerilakuKonsumen(
        servisList
      );


    const timing =
      this.tentukanReminderTiming(
        analisis
      );


    return {

      pelangganId,

      jarakWaktu:
        timing.jarakWaktu,

      hariPengiriman:
        timing.hariPengiriman as any,

      waktuPengiriman:
        timing.waktuPengiriman,

      analisis
    };
  }
}